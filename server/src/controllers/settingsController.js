const supabase = require('../supabase');

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('preferences, signature')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ settings: { preferences: user.preferences, signature: user.signature } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/settings
exports.updateSettings = async (req, res) => {
  try {
    const { preferences, signature, imapConfig, smtpConfig } = req.body;
    const updates = {};
    if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };
    if (signature) updates.signature = { ...req.user.signature, ...signature };
    if (imapConfig) updates.imap_config = imapConfig;
    if (smtpConfig) updates.smtp_config = smtpConfig;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('preferences, signature')
      .single();

    if (error) throw error;
    res.json({ settings: { preferences: user.preferences, signature: user.signature } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
