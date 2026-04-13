const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const supabase = require('../supabase');

// ── Get OAuth2 Client ──────────────────────────────────────────────────────────
const getOAuth2Client = (refreshToken) => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
  );
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
};

// ── Get user's full record (with tokens) for email operations ──────────────────
const getFullUser = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return user;
};

// ── Get Nodemailer Transporter ─────────────────────────────────────────────────
const getTransporter = async (user) => {
  // Option 1: Use Google OAuth2 tokens
  if (user.google_tokens?.refreshToken) {
    try {
      const oAuth2Client = getOAuth2Client(user.google_tokens.refreshToken);
      const { token: accessToken } = await oAuth2Client.getAccessToken();

      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: user.email,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: user.google_tokens.refreshToken,
          accessToken,
        },
      });
    } catch (err) {
      console.error('OAuth token error:', err.message);
      // Fall through to other options or throw
    }
  }

  // Option 2: Use user's manual SMTP config if they provided it
  if (user.smtp_config?.host && user.smtp_config?.user && user.smtp_config?.pass) {
    return nodemailer.createTransport({
      host: user.smtp_config.host,
      port: user.smtp_config.port || 587,
      secure: user.smtp_config.port === 465,
      auth: { user: user.smtp_config.user, pass: user.smtp_config.pass }
    });
  }

  // If Google user but we reached here, their refresh token is missing/invalid
  if (user.google_id) {
    throw new Error('MISSING_GOOGLE_AUTH: Your Google account is not fully authorized for sending. Please Sign Out and Sign In again to re-link your account.');
  }

  // Option 3: Final fallback to system SMTP (only for app owner/specific setup)
  if (process.env.SMTP_USER && process.env.SMTP_PASS && user.email === process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }

  throw new Error('NO_ACCOUNT_LINKED: No email sending method found. Please link your Google account or provide SMTP settings in Settings.');
};

// ── Gmail Sync Helper ──────────────────────────────────────────────────────────
const getGmailClient = (refreshToken) => {
  const oAuth2Client = getOAuth2Client(refreshToken);
  return google.gmail({ version: 'v1', auth: oAuth2Client });
};

const parseEmailAddress = (raw) => {
  if (!raw) return { name: '', address: '' };
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, '').trim(), address: match[2].trim() };
  return { name: '', address: raw.trim() };
};

const parseAddressList = (raw) => {
  if (!raw) return [];
  return raw.split(',').map(s => parseEmailAddress(s.trim())).filter(a => a.address);
};

const syncGmailEmails = async (userId, accountId, refreshToken, folder = 'inbox') => {
  if (!refreshToken) return;

  try {
    const gmail = getGmailClient(refreshToken);
    const labelMap = { inbox: 'INBOX', sent: 'SENT', drafts: 'DRAFT', spam: 'SPAM', trash: 'TRASH', starred: 'STARRED', archive: 'INBOX' };
    const labelId = labelMap[folder] || 'INBOX';

    let pageToken = undefined;
    const MAX_PAGES = 10;
    const MAX_NEW_PER_SYNC = 50;
    let totalSynced = 0;
    let stopSync = false;

    console.log(`[Sync] Starting sliding window sync for account ${accountId} (folder: ${folder})...`);

    for (let pg = 0; pg < MAX_PAGES && !stopSync && totalSynced < MAX_NEW_PER_SYNC; pg++) {
      const listRes = await gmail.users.messages.list({
        userId: 'me', labelIds: [labelId], maxResults: 50,
        ...(pageToken ? { pageToken } : {}),
      });
      
      const msgs = listRes.data.messages || [];
      if (msgs.length === 0) break;
      pageToken = listRes.data.nextPageToken;

      const pageIds = msgs.map(m => m.id);
      const { data: existing } = await supabase
        .from('emails')
        .select('message_id')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .in('message_id', pageIds);
      
      const existingSet = new Set((existing || []).map(e => e.message_id));
      const newInPage = msgs.filter(m => !existingSet.has(m.id));

      if (existingSet.size > (msgs.length * 0.8) && pg > 0) {
        console.log(`[Sync] High redundancy detected for account ${accountId}. Stopping sync.`);
        stopSync = true;
      }

      if (newInPage.length === 0) {
        if (!pageToken) break;
        continue;
      }

      const fetchDetailedBatch = async (batch) => {
        return Promise.all(batch.map(async (msg) => {
          try {
            const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
            const headers = full.data.payload?.headers || [];
            const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

            const subject = getHeader('Subject');
            const from = parseEmailAddress(getHeader('From'));
            const to = parseAddressList(getHeader('To'));
            const cc = parseAddressList(getHeader('Cc'));
            const date = getHeader('Date');

            let bodyHtml = '', bodyText = '';
            const attachments = [];
            const extractBody = (payload) => {
              if (payload.filename && payload.body?.attachmentId) {
                attachments.push({
                  filename: payload.filename,
                  mimetype: payload.mimeType || 'application/octet-stream',
                  size: payload.body?.size || 0,
                  attachmentId: payload.body?.attachmentId,
                  partId: payload.partId,
                  path: `/api/emails/${msg.id}/attachments/${payload.body?.attachmentId || payload.partId}`
                });
              }
              if (payload.mimeType === 'text/html' && payload.body?.data)
                bodyHtml = Buffer.from(payload.body.data, 'base64url').toString('utf8');
              else if (payload.mimeType === 'text/plain' && payload.body?.data)
                bodyText = Buffer.from(payload.body.data, 'base64url').toString('utf8');
              if (payload.parts) payload.parts.forEach(extractBody);
            };
            extractBody(full.data.payload || {});
            if (!bodyHtml && bodyText)
              bodyHtml = `<pre style="white-space:pre-wrap;font-family:inherit">${bodyText}</pre>`;

            return {
              user_id: userId,
              account_id: accountId,
              message_id: msg.id,
              folder,
              from_address: from,
              to_addresses: to,
              cc,
              subject: subject || '(No Subject)',
              body_html: bodyHtml,
              body_text: bodyText,
              attachments,
              is_read: !(full.data.labelIds || []).includes('UNREAD'),
              is_starred: (full.data.labelIds || []).includes('STARRED'),
              thread_id: full.data.threadId || '',
              received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
              created_at: date ? new Date(date).toISOString() : new Date().toISOString(),
            };
          } catch (err) {
            console.error(`[Sync] Failed to fetch ${msg.id}:`, err.message);
            return null;
          }
        }));
      };

      const emailRows = (await fetchDetailedBatch(newInPage)).filter(Boolean);

      if (emailRows.length > 0) {
        const { error } = await supabase.from('emails').insert(emailRows);
        if (error) {
          console.error('[Sync] DB Insert error:', error.message);
        } else {
          totalSynced += emailRows.length;
        }
      }

      if (!pageToken) break;
    }

    console.log(`[Sync] Finished account ${accountId}. Total emails synced: ${totalSynced}`);
  } catch (err) {
    console.error(`[Sync] Global error for account ${accountId}:`, err.message);
  }
};

// ── Shared response mapper ─────────────────────────────────────────────────────
const mapEmail = (e) => ({
  ...e,
  _id: e.id,
  from: e.from_address,
  to: e.to_addresses,
  bodyHtml: e.body_html,
  bodyText: e.body_text,
  attachments: e.attachments,
  isRead: e.is_read,
  isStarred: e.is_starred,
  isScheduled: e.is_scheduled,
  scheduledAt: e.scheduled_at,
  threadId: e.thread_id,
  messageId: e.message_id,
  receivedAt: e.received_at,
  createdAt: e.created_at,
});

// GET /api/emails/sync
exports.sync = async (req, res) => {
  try {
    const folder = req.query.folder || 'inbox';
    
    // Find all linked google accounts for this user
    const { data: accounts } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('provider', 'google');

    if (accounts && accounts.length > 0) {
       // Run sync for all accounts in parallel
       await Promise.all(accounts.map(acc => 
         syncGmailEmails(req.user.id, acc.id, acc.google_tokens?.refreshToken, folder)
       ));
    }

    res.json({ message: 'Sync complete' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/emails
exports.list = async (req, res) => {
  try {
    const { folder = 'inbox', page = 1, limit = 100, accountId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);

    // Sync for all linked Google accounts on first page
    if (parseInt(page) === 1) {
      const { data: accounts } = await supabase
        .from('linked_accounts')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('provider', 'google');

      if (accounts && accounts.length > 0) {
        const targetAccounts = accountId && accountId !== 'all' 
          ? accounts.filter(a => a.id === accountId)
          : accounts;

        await Promise.all(targetAccounts.map(acc => 
          syncGmailEmails(req.user.id, acc.id, acc.google_tokens?.refreshToken, folder)
            .catch(err => console.error(`Background sync error for ${acc.id}:`, err.message))
        ));
      }
    }

    let query = supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id);

    if (folder === 'starred') {
      query = query.eq('is_starred', true);
    } else {
      query = query.eq('folder', folder);
    }

    if (accountId && accountId !== 'all') {
      query = query.eq('account_id', accountId);
    }

    const { data: emails, count, error } = await query
      .order('received_at', { ascending: false })
      .range(offset, offset + lim - 1);

    if (error) throw error;

    // Get unread count — count unique threads, not individual messages
    const { data: unreadEmails } = await supabase
      .from('emails')
      .select('thread_id')
      .eq('user_id', req.user.id)
      .eq('folder', 'inbox')
      .eq('is_read', false);

    // Count unique threads (emails without thread_id count as 1 each)
    const unreadThreads = new Set();
    (unreadEmails || []).forEach(e => {
      unreadThreads.add(e.thread_id || `no-thread-${Math.random()}`);
    });
    const unreadCount = unreadThreads.size;

    // Also count unique threads for total to match what the UI displays
    const threadSet = new Set();
    (emails || []).forEach(e => {
      threadSet.add(e.thread_id || `no-thread-${e.id}`);
    });

    res.json({
      emails: (emails || []).map(mapEmail),
      total: threadSet.size,
      page: parseInt(page),
      pages: Math.ceil((count || 0) / lim),
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/emails/search
exports.search = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q) return res.json({ emails: [], total: 0 });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);

    const { data: emails, count, error } = await supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .textSearch('fts', q.split(' ').join(' & '))
      .range(offset, offset + lim - 1)
      .order('received_at', { ascending: false });

    if (error) throw error;

    res.json({
      emails: (emails || []).map(mapEmail),
      total: count || 0,
      page: parseInt(page),
      pages: Math.ceil((count || 0) / lim)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/emails/:id
exports.getOne = async (req, res) => {
  try {
    const { data: email, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !email) return res.status(404).json({ message: 'Email not found' });
    res.json({ email: mapEmail(email) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/emails/send
exports.send = async (req, res) => {
  try {
    const { to, cc, bcc, subject, bodyHtml, bodyText } = req.body;
    const files = req.files || [];
    const attachments = files.map(f => ({
      filename: f.originalname, mimetype: f.mimetype, size: f.size,
      path: f.path ? `/uploads/${f.filename}` : null
    }));

    const toArr = Array.isArray(to) ? to : JSON.parse(to || '[]');
    const ccArr = Array.isArray(cc) ? cc : JSON.parse(cc || '[]');
    const bccArr = Array.isArray(bcc) ? bcc : JSON.parse(bcc || '[]');

    // Save to sent folder
    const { data: email, error } = await supabase
      .from('emails')
      .insert({
        user_id: req.user.id,
        folder: 'sent',
        from_address: { name: req.user.name, address: req.user.email },
        to_addresses: toArr,
        cc: ccArr,
        bcc: bccArr,
        subject: subject || '(No Subject)',
        body_html: bodyHtml || '',
        body_text: bodyText || '',
        attachments,
        is_read: true,
        message_id: `${Date.now()}@stitch-mail`
      })
      .select()
      .single();

    if (error) throw error;

    // Send via SMTP/OAuth
    try {
      const fullUser = await getFullUser(req.user.id);
      const transporter = await getTransporter(fullUser);

      // Build nodemailer attachments — handle both disk storage (path) and memory storage (buffer)
      const mailAttachments = files.map(f => {
        if (f.buffer) {
          return { filename: f.originalname, content: f.buffer, contentType: f.mimetype };
        }
        return { filename: f.originalname, path: f.path };
      });

      await transporter.sendMail({
        from: `"${req.user.name}" <${req.user.email}>`,
        to: toArr.map(t => t.address || t).join(', '),
        cc: ccArr.map(t => t.address || t).join(', '),
        bcc: bccArr.map(t => t.address || t).join(', '),
        subject: subject || '(No Subject)',
        html: bodyHtml,
        text: bodyText,
        attachments: mailAttachments
      });
      console.log(`✅ Email dispatched to ${toArr.map(t => t.address || t).join(', ')}`);

      res.status(201).json({ email: mapEmail(email), message: 'Email sent' });
    } catch (smtpErr) {
      console.error('SMTP send failed:', smtpErr.message);
      await supabase.from('emails').delete().eq('id', email.id);
      res.status(500).json({ message: 'Failed to send email. Error: ' + smtpErr.message });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/emails/draft
exports.draft = async (req, res) => {
  try {
    const { to, cc, bcc, subject, bodyHtml, bodyText, draftId } = req.body;
    const files = req.files || [];
    const attachments = files.map(f => ({
      filename: f.originalname, mimetype: f.mimetype, size: f.size, path: `/uploads/${f.filename}`
    }));

    const toArr = Array.isArray(to) ? to : JSON.parse(to || '[]');
    const data = {
      user_id: req.user.id,
      folder: 'drafts',
      from_address: { name: req.user.name, address: req.user.email },
      to_addresses: toArr,
      cc: Array.isArray(cc) ? cc : JSON.parse(cc || '[]'),
      bcc: Array.isArray(bcc) ? bcc : JSON.parse(bcc || '[]'),
      subject: subject || '',
      body_html: bodyHtml || '',
      body_text: bodyText || '',
      attachments,
      is_read: true
    };

    let email;
    if (draftId) {
      const { data: updated, error } = await supabase
        .from('emails')
        .update(data)
        .eq('id', draftId)
        .eq('user_id', req.user.id)
        .select()
        .single();
      if (error) throw error;
      email = updated;
    } else {
      const { data: created, error } = await supabase
        .from('emails')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      email = created;
    }

    res.status(201).json({ email: mapEmail(email) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/emails/:id
exports.update = async (req, res) => {
  try {
    const allowedMap = {
      isRead: 'is_read',
      isStarred: 'is_starred',
      folder: 'folder',
      labels: 'labels',
    };

    const updates = {};
    Object.entries(allowedMap).forEach(([camel, snake]) => {
      if (req.body[camel] !== undefined) updates[snake] = req.body[camel];
    });

    const { data: email, error } = await supabase
      .from('emails')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!email) return res.status(404).json({ message: 'Email not found' });

    res.json({ email: mapEmail(email) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/emails/:id
exports.remove = async (req, res) => {
  try {
    const { data: email, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !email) return res.status(404).json({ message: 'Email not found' });

    if (email.folder === 'trash') {
      await supabase.from('emails').delete().eq('id', email.id);
      return res.json({ message: 'Permanently deleted' });
    }

    const { data: updated } = await supabase
      .from('emails')
      .update({ folder: 'trash' })
      .eq('id', email.id)
      .select()
      .single();

    res.json({ email: mapEmail(updated), message: 'Moved to trash' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/emails/:id/schedule
exports.schedule = async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) return res.status(400).json({ message: 'scheduledAt is required' });

    const { data: email, error } = await supabase
      .from('emails')
      .update({ is_scheduled: true, scheduled_at: new Date(scheduledAt).toISOString(), folder: 'drafts' })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!email) return res.status(404).json({ message: 'Email not found' });

    res.json({ email: mapEmail(email) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/emails/tree — Structured Inbox Tree View
exports.getTree = async (req, res) => {
  try {
    const { search = '', folder = 'inbox' } = req.query;
    const { buildEmailTree } = require('../services/geminiService');

    // Fetch all emails for the user in the requested folder (up to 500 for tree)
    let query = supabase
      .from('emails')
      .select('*')
      .eq('user_id', req.user.id);

    if (folder === 'starred') {
      query = query.eq('is_starred', true);
    } else {
      query = query.eq('folder', folder);
    }

    const { data: emails, error } = await query
      .order('received_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // Build hierarchical tree
    const tree = await buildEmailTree(emails || [], search);

    // Map emails inside tree nodes for frontend compatibility
    const mappedTree = tree.map(org => ({
      ...org,
      contacts: org.contacts.map(contact => ({
        ...contact,
        emails: contact.emails.map(mapEmail),
      })),
    }));

    res.json({
      tree: mappedTree,
      totalOrgs: mappedTree.length,
      totalEmails: (emails || []).length,
      totalUnread: (emails || []).filter(e => !e.is_read).length,
    });
  } catch (err) {
    console.error('getTree error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/emails/:id/tree-override — Save drag-drop reassignment
exports.treeOverride = async (req, res) => {
  try {
    const { orgDomain } = req.body;
    if (orgDomain === undefined) {
      return res.status(400).json({ message: 'orgDomain is required' });
    }

    const { data: email, error } = await supabase
      .from('emails')
      .update({ tree_org_override: orgDomain || '' })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!email) return res.status(404).json({ message: 'Email not found' });

    res.json({ email: mapEmail(email) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/emails/:id/attachments/:attachmentId
exports.getAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    console.log(`[Attachment] Fetching attachment for email ${id}, attachmentId: ${attachmentId?.substring(0, 30)}...`);

    const { data: email, error: emailErr } = await supabase
      .from('emails')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (emailErr || !email) {
      console.error('[Attachment] Email not found:', emailErr?.message);
      return res.status(404).json({ message: 'Email not found' });
    }

    // Try to get refresh token from the linked account first (multi-account support)
    let refreshToken = null;

    if (email.account_id) {
      const { data: account } = await supabase
        .from('linked_accounts')
        .select('google_tokens')
        .eq('id', email.account_id)
        .eq('user_id', req.user.id)
        .single();

      if (account?.google_tokens?.refreshToken) {
        refreshToken = account.google_tokens.refreshToken;
        console.log('[Attachment] Using linked account refresh token');
      }
    }

    // Fallback to user-level google_tokens
    if (!refreshToken) {
      const fullUser = await getFullUser(req.user.id);
      if (fullUser?.google_tokens?.refreshToken) {
        refreshToken = fullUser.google_tokens.refreshToken;
        console.log('[Attachment] Using user-level refresh token');
      }
    }

    if (!refreshToken) {
      return res.status(403).json({ message: 'Google account not linked. Please re-link your account.' });
    }

    const gmail = getGmailClient(refreshToken);

    // Fetch the attachment data from Gmail
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: email.message_id,
      id: attachmentId,
    });

    if (!response.data?.data) {
      return res.status(404).json({ message: 'Attachment data not found in Gmail' });
    }

    const dataBuffer = Buffer.from(response.data.data, 'base64url');

    // Find the mimetype from the email record if possible
    const attachmentInfo = email.attachments?.find(a => a.attachmentId === attachmentId || a.partId === attachmentId);
    const contentType = attachmentInfo?.mimetype || 'application/octet-stream';
    const filename = attachmentInfo?.filename || 'attachment';

    // Set headers for proper display/download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', dataBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(dataBuffer);
  } catch (err) {
    console.error('[Attachment] Error:', err.message);
    res.status(500).json({ message: 'Failed to load attachment: ' + err.message });
  }
};

// Export getTransporter and getFullUser for scheduledSend job
exports._getTransporter = getTransporter;
exports._getFullUser = getFullUser;
