const supabase = require('../supabase');

// GET /api/accounts
exports.listAccounts = async (req, res) => {
  try {
    const { data: accounts, error } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // For each account, get unread count and check health
    const enriched = await Promise.all((accounts || []).map(async (acc) => {
      const { count: unread } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', acc.id)
        .eq('folder', 'inbox')
        .eq('is_read', false);
      
      const { count: urgent } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', acc.id)
        .eq('folder', 'inbox')
        .contains('labels', ['URGENT'])
        .eq('is_read', false);

      const hasRefreshToken = !!(acc.google_tokens?.refreshToken || acc.google_tokens?.refresh_token);
      const needsReconnect = acc.provider === 'google' && !hasRefreshToken;

      return {
        ...acc,
        unread: unread || 0,
        urgent: urgent || 0,
        type: acc.provider === 'google' ? 'GMAIL' : 'IMAP',
        status: needsReconnect ? 'needs_reconnect' : (acc.status || 'active'),
        needsReconnect
      };
    }));

    res.json({ accounts: enriched });
  } catch (err) {
    console.error('listAccounts error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/accounts
exports.addAccount = async (req, res) => {
  try {
    const { provider, email, imapConfig, smtpConfig } = req.body;
    
    if (!email || !provider) {
      return res.status(400).json({ message: 'Email and provider are required' });
    }

    const { data: account, error } = await supabase
      .from('linked_accounts')
      .upsert({
        user_id: req.user.id,
        email: email.toLowerCase().trim(),
        provider: provider.toLowerCase(),
        imap_config: imapConfig || {},
        smtp_config: smtpConfig || {},
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Account linked successfully', account });
  } catch (err) {
    console.error('addAccount error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/accounts/:id
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete account (cascade will handle emails if set, but we manually track as well)
    const { error } = await supabase
      .from('linked_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/accounts/unified-inbox
exports.unifiedInbox = async (req, res) => {
  try {
    const { data: emails, count } = await supabase
      .from('emails')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('folder', 'inbox')
      .order('received_at', { ascending: false })
      .limit(100);

    res.json({
      emails: (emails || []).map(e => ({
        ...e,
        _id: e.id,
        from: e.from_address,
        to: e.to_addresses,
        bodyHtml: e.body_html,
        bodyText: e.body_text,
        isRead: e.is_read,
        isStarred: e.is_starred,
        createdAt: e.created_at,
        receivedAt: e.received_at
      })),
      total: count || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
