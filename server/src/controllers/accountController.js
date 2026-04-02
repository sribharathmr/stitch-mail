const supabase = require('../supabase');

// GET /api/accounts
exports.listAccounts = async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, avatar')
      .eq('id', req.user.id)
      .single();

    const { count: unread } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('folder', 'inbox')
      .eq('is_read', false);

    const accounts = [{
      id: user.id,
      _id: user.id,
      type: 'WORK',
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      unread: unread || 0,
      urgent: 0,
      status: 'active'
    }];

    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/accounts
exports.addAccount = async (req, res) => {
  try {
    const { imapConfig, smtpConfig, email, name } = req.body;
    await supabase
      .from('users')
      .update({ imap_config: imapConfig, smtp_config: smtpConfig })
      .eq('id', req.user.id);

    res.json({ message: 'Account configured', email, name });
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
      .order('created_at', { ascending: false })
      .limit(50);

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
      })),
      total: count || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
