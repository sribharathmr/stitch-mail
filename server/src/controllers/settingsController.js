const supabase = require('../supabase');
const bcrypt = require('bcryptjs');

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('preferences, signature, imap_config, smtp_config')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ 
      settings: { 
        preferences: user.preferences, 
        signature: user.signature,
        imapConfig: user.imap_config || {},
        smtpConfig: user.smtp_config || {}
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/settings
exports.updateSettings = async (req, res) => {
  try {
    const { preferences, signature, imapConfig, smtpConfig, password } = req.body;
    const updates = {};
    if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };
    if (signature) updates.signature = { ...req.user.signature, ...signature };
    if (imapConfig) updates.imap_config = imapConfig;
    if (smtpConfig) updates.smtp_config = smtpConfig;

    if (password && password.current && password.newPassword) {
      // Verify current password
      const { data: dbUser, error: uErr } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', req.user.id)
        .single();
        
      if (uErr || !dbUser) throw uErr || new Error('User not found');
      if (!dbUser.password_hash) {
        return res.status(400).json({ message: 'Account uses Google OAuth. No password to change.' });
      }

      const isValid = await bcrypt.compare(password.current, dbUser.password_hash);
      if (!isValid) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      updates.password_hash = await bcrypt.hash(password.newPassword, 12);
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('preferences, signature, imap_config, smtp_config')
      .single();

    if (error) throw error;
    res.json({ 
      settings: { 
        preferences: user.preferences, 
        signature: user.signature,
        imapConfig: user.imap_config || {},
        smtpConfig: user.smtp_config || {}
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
