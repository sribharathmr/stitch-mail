const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

module.exports = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !user) return res.status(401).json({ message: 'User not found' });

    // Remove ALL sensitive fields
    const {
      password_hash,
      google_tokens,
      imap_config,
      smtp_config,
      ...safeUser
    } = user;

    // Attach raw tokens separately for internal use only (not exposed in API responses)
    req.user = safeUser;
    req.userTokens = { google_tokens, imap_config, smtp_config };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
