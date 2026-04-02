const supabase = require('../supabase');
const ollamaService = require('../services/ollamaService');

// 1. Conversation Memory
exports.getMemory = async (req, res) => {
  try {
    const threadId = req.params.threadId;

    const { data: emails } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (!emails || emails.length === 0) {
      return res.status(404).json({ message: 'No emails found for this thread.' });
    }

    const context = emails.map(e =>
      `From: ${e.from_address?.name || e.from_address?.address}\nTime: ${e.created_at}\nSubject: ${e.subject}\n\n${e.body_text}`
    ).join('\n\n----------\n\n');

    const memory = await ollamaService.analyzeThreadMemory(context);
    res.json(memory);
  } catch (error) {
    console.error('getMemory Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// 2. Intent-Based Draft
exports.generateIntentDraft = async (req, res) => {
  try {
    const { intent, tone, threadId } = req.body;
    let context = '';

    if (threadId) {
      const { data: emails } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (emails && emails.length) {
        context = emails.map(e =>
          `From: ${e.from_address?.name || e.from_address?.address}\n\n${e.body_text}`
        ).join('\n\n----------\n\n');
      }
    }

    const draftText = await ollamaService.generateDraftIntent(intent, tone || 'professional', context);
    res.json({ draft: draftText.trim() });
  } catch (error) {
    console.error('generateIntentDraft Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// 3. Smart Unsubscribe
exports.findSubscriptions = async (req, res) => {
  try {
    const { data: emails } = await supabase
      .from('emails')
      .select('from_address, subject, body_text')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const senders = {};
    for (const em of (emails || [])) {
      const addr = em.from_address?.address;
      if (!addr) continue;
      if (!senders[addr]) {
        senders[addr] = { name: em.from_address.name, address: addr, count: 0, sampleSubject: em.subject, sampleBody: em.body_text };
      }
      senders[addr].count++;
    }

    const candidates = Object.values(senders).filter(s =>
      s.count > 1 || s.sampleSubject.toLowerCase().includes('newsletter') || s.sampleSubject.toLowerCase().includes('update')
    );

    const results = [];
    for (let i = 0; i < Math.min(candidates.length, 5); i++) {
      const c = candidates[i];
      const isNews = await ollamaService.isNewsletter(c.sampleSubject, c.address, c.sampleBody);
      if (isNews) {
        results.push({ name: c.name, address: c.address, count: c.count });
      }
    }

    res.json({ subscriptions: results });
  } catch (error) {
    console.error('findSubscriptions Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ message: 'address is required' });

    const { data: emails } = await supabase
      .from('emails')
      .select('id')
      .eq('user_id', req.user.id)
      .contains('from_address', { address });

    if (emails && emails.length > 0) {
      const ids = emails.map(e => e.id);
      await supabase
        .from('emails')
        .update({ folder: 'trash' })
        .in('id', ids);
    }

    res.json({ success: true, message: `Unsubscribed from ${address} and moved ${emails?.length || 0} emails to trash.` });
  } catch (error) {
    console.error('unsubscribe Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// 4. Smart Categorize
exports.categorizeInbox = async (req, res) => {
  try {
    const { data: emails } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('folder', 'inbox')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!emails || emails.length === 0) {
      return res.json({ message: 'No emails in inbox.', categorizedCount: 0 });
    }

    // Filter to only emails that have not been categorized yet
    const uncategorized = emails.filter(email => {
      const currentLabels = email.labels || [];
      return !currentLabels.includes('SOCIAL') && 
             !currentLabels.includes('PROMOTIONS') && 
             !currentLabels.includes('PRIMARY') &&
             !currentLabels.includes('CATEGORIZED');
    });

    // Only process up to 10 at a time to prevent timeout
    const toProcess = uncategorized.slice(0, 10);

    if (toProcess.length === 0) {
      return res.json({ message: 'All recent emails are already categorized.', categorizedCount: 0 });
    }

    let categorizedCount = 0;

    for (const email of toProcess) {
      try {
        const senderName = email.from_address?.name || '';
        const senderEmail = email.from_address?.address || '';
        const senderStr = senderName ? `${senderName} <${senderEmail}>` : senderEmail;
        
        console.log(`Categorizing: [${senderStr}] ${email.subject}`);
        const category = await ollamaService.categorizeEmail(email.subject, senderStr, email.body_text || '');
        console.log(`  -> ${category}`);

        const currentLabels = email.labels || [];
        const newLabels = [...new Set([...currentLabels, category, 'CATEGORIZED'])];
        await supabase
          .from('emails')
          .update({ labels: newLabels })
          .eq('id', email.id);
        categorizedCount++;
      } catch (err) {
        console.error(`Error categorizing email ${email.id}:`, err.message);
      }
    }

    res.json({ success: true, categorizedCount, message: `Successfully categorized ${categorizedCount} emails.` });
  } catch (error) {
    console.error('categorizeInbox Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};
