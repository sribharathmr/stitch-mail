const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const supabase = require('../supabase');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('❌ FATAL: JWT_SECRET environment variable is required');
}

const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const isProduction = process.env.NODE_ENV === 'production';

const setCookie = (res, token) =>
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000
  });

const toSafeUser = (user) => {
  if (!user) return null;
  
  // If this user already has the pre-calculated flags (from the auth middleware)
  // we return it immediately as the sensitive data is already stripped.
  if (user.canSend !== undefined) {
    return user;
  }

  const { password_hash, google_tokens, imap_config, smtp_config, ...safe } = user;
  
  // Calculate flags for fresh database records (login, registration, callback)
  const hasGoogleAuth = !!(google_tokens?.refreshToken || google_tokens?.refresh_token);
  const hasSmtpConfig = !!(smtp_config?.host && smtp_config?.user && smtp_config?.pass);

  return { 
    ...safe, 
    canSend: hasGoogleAuth || hasSmtpConfig,
    isGoogleUser: !!user.google_id,
    missingGoogleAuth: !!(user.google_id && !hasGoogleAuth)
  };
};

const getOAuthClient = (redirectUri) => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
);

// ─── Input validation helpers ───────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegisterInput(name, email, password) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length < 2)
    errors.push('Name must be at least 2 characters');
  if (name && name.trim().length > 100)
    errors.push('Name must be under 100 characters');
  if (!email || !EMAIL_REGEX.test(email))
    errors.push('Valid email is required');
  if (!password || password.length < 8)
    errors.push('Password must be at least 8 characters');
  if (password && password.length > 128)
    errors.push('Password must be under 128 characters');
  return errors;
}

function validateLoginInput(email, password) {
  const errors = [];
  if (!email || !EMAIL_REGEX.test(email))
    errors.push('Valid email is required');
  if (!password || password.length === 0)
    errors.push('Password is required');
  return errors;
}

// ─── Local register ────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const errors = validateRegisterInput(name, email, password);
    if (errors.length > 0)
      return res.status(400).json({ message: errors.join('. ') });

    // Check if email exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ name: name.trim(), email: email.toLowerCase().trim(), password_hash })
      .select()
      .single();

    if (error) throw error;

    const token = signToken(user.id);
    setCookie(res, token);
    res.status(201).json({ user: toSafeUser(user), token });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ─── Local login ───────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const errors = validateLoginInput(email, password);
    if (errors.length > 0)
      return res.status(400).json({ message: errors.join('. ') });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user || !user.password_hash)
      return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user.id);
    setCookie(res, token);
    res.json({ user: toSafeUser(user), token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ─── Google OAuth — Step 1: Redirect to Google ────────────────────────────────
exports.googleAuth = (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/google/callback`;

  const oAuth2Client = getOAuthClient(dynamicRedirectUri);
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://mail.google.com/',
    ],
  });
  res.redirect(url);
};

// ─── Google OAuth — Step 2: Handle Callback ───────────────────────────────────
exports.googleAuthCallback = async (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/google/callback`;
  const clientUrl = host.includes('localhost') ? 'http://localhost:5173' : `${protocol}://${host}`;

  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${clientUrl}/login?error=no_code`);

    const oAuth2Client = getOAuthClient(dynamicRedirectUri);
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Fetch user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const googleTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };

    // Find existing user by google_id
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', profile.id)
      .single();

    if (!user) {
      // Check if an account with same email was registered manually
      const { data: emailUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', profile.email.toLowerCase())
        .single();
      user = emailUser;
    }

    if (user) {
      // Get the existing tokens to merge
      const existingTokens = user.google_tokens || {};
      
      // Update existing user with fresh tokens
      const updateData = {
        google_id: profile.id,
        google_tokens: {
          accessToken: googleTokens.accessToken,
          expiryDate: googleTokens.expiryDate,
          // If google didn't return a new refresh token, keep the one we have
          refreshToken: googleTokens.refreshToken || existingTokens.refreshToken || existingTokens.refresh_token,
        }
      };
      if (profile.picture && !user.avatar) updateData.avatar = profile.picture;

      const { data: updated } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
      user = updated || user;
    } else {
      // Create brand new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          name: profile.name,
          email: profile.email.toLowerCase(),
          google_id: profile.id,
          avatar: profile.picture || '',
          google_tokens: googleTokens,
        })
        .select()
        .single();

      if (error) throw error;
      user = newUser;
    }

    // ── Auto-create/update linked_accounts so sync & send work ──────────────
    try {
      const { data: existingLinked } = await supabase
        .from('linked_accounts')
        .select('id, google_tokens')
        .eq('user_id', user.id)
        .eq('email', (profile.email || user.email).toLowerCase())
        .single();

      if (existingLinked) {
        // Update tokens on existing linked account
        const mergedTokens = {
          ...existingLinked.google_tokens,
          accessToken: googleTokens.accessToken,
          expiryDate: googleTokens.expiryDate,
          refreshToken: googleTokens.refreshToken || existingLinked.google_tokens?.refreshToken,
        };
        await supabase
          .from('linked_accounts')
          .update({ google_tokens: mergedTokens, status: 'active' })
          .eq('id', existingLinked.id);
      } else {
        // Create new linked account entry
        await supabase
          .from('linked_accounts')
          .insert({
            user_id: user.id,
            email: (profile.email || user.email).toLowerCase(),
            provider: 'google',
            google_tokens: googleTokens,
            status: 'active',
          });
      }
      console.log(`✅ Linked account ensured for ${profile.email}`);
    } catch (linkErr) {
      console.error('Auto-link account error (non-fatal):', linkErr.message);
    }

    // Issue our own JWT and redirect to frontend
    // Pass token in URL so the frontend can store it in per-tab sessionStorage
    const jwtToken = signToken(user.id);
    setCookie(res, jwtToken);
    res.redirect(`${clientUrl}/inbox?token=${jwtToken}`);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
};

// ─── Google Account Linking — Step 1: Redirect ───────────────────────────────
exports.googleLink = (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  // Use a distinct callback for linking
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/google/link/callback`;

  const oAuth2Client = getOAuthClient(dynamicRedirectUri);
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://mail.google.com/',
    ],
  });
  res.redirect(url);
};

// ─── Google Account Linking — Step 2: Handle Callback ──────────────────────────
exports.googleLinkCallback = async (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const dynamicRedirectUri = `${protocol}://${host}/api/auth/google/link/callback`;
  const clientUrl = host.includes('localhost') ? 'http://localhost:5173' : `${protocol}://${host}`;

  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${clientUrl}/accounts?error=no_code`);

    const oAuth2Client = getOAuthClient(dynamicRedirectUri);
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    const googleTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };

    // Save to linked_accounts table
    const { data: existing } = await supabase
      .from('linked_accounts')
      .select('id, google_tokens')
      .eq('user_id', req.user.id)
      .eq('email', profile.email.toLowerCase())
      .single();

    if (existing) {
      // Update tokens
      const mergedTokens = {
        ...existing.google_tokens,
        accessToken: googleTokens.accessToken,
        expiryDate: googleTokens.expiryDate,
        refreshToken: googleTokens.refreshToken || existing.google_tokens.refreshToken
      };
      await supabase
        .from('linked_accounts')
        .update({ google_tokens: mergedTokens, status: 'active' })
        .eq('id', existing.id);
    } else {
      // Create new linked account
      await supabase
        .from('linked_accounts')
        .insert({
          user_id: req.user.id,
          email: profile.email.toLowerCase(),
          provider: 'google',
          google_tokens: googleTokens,
          status: 'active'
        });
    }

    // Redirect back to accounts page
    res.redirect(`${clientUrl}/accounts?success=linked`);
  } catch (err) {
    console.error('Google Link error:', err.message);
    res.redirect(`${clientUrl}/accounts?error=link_failed`);
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out' });
};

// ─── Get current user ──────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  res.json({ user: toSafeUser(req.user), token });
};
