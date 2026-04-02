require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// ─── Validate required env vars ────────────────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
  if (process.env.VERCEL !== '1') process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';

const authRoutes     = require('./routes/auth');
const emailRoutes    = require('./routes/emails');
const threadRoutes   = require('./routes/threads');
const settingsRoutes = require('./routes/settings');
const accountRoutes  = require('./routes/accounts');
const aiRoutes       = require('./routes/ai');

const app = express();

// ─── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ─── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Trust proxy (Vercel/Railway) ──────────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Static files (local dev only) ─────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// ─── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth',     authRoutes);
app.use('/api/emails',   emailRoutes);
app.use('/api/threads',  threadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/ai',       aiRoutes);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const checks = { server: 'ok', time: new Date().toISOString() };
  try {
    const supabase = require('./supabase');
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = error ? 'error' : 'ok';
  } catch {
    checks.database = 'error';
  }
  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(ollamaUrl.replace('/api/generate', ''), { signal: controller.signal });
    clearTimeout(timeout);
    checks.ai = resp.ok ? 'ok' : 'error';
  } catch {
    checks.ai = 'unavailable';
  }
  const status = checks.database === 'ok' ? 200 : 503;
  res.status(status).json(checks);
});

// ─── Scheduled send endpoint (for Vercel Cron) ────────────────────────────────
app.post('/api/cron/scheduled-send', async (req, res) => {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = req.headers['authorization'];
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const supabase = require('./supabase');
    const { _getTransporter: getTransporter, _getFullUser: getFullUser } = require('./controllers/emailController');
    const now = new Date().toISOString();

    const { data: scheduled, error } = await supabase
      .from('emails')
      .select('*')
      .eq('is_scheduled', true)
      .eq('folder', 'drafts')
      .lte('scheduled_at', now);

    if (error || !scheduled || scheduled.length === 0) {
      return res.json({ message: 'No scheduled emails to send', count: 0 });
    }

    let sentCount = 0;
    for (const email of scheduled) {
      try {
        const user = await getFullUser(email.user_id);
        if (!user) continue;

        const transporter = await getTransporter(user);
        const toAddresses = (email.to_addresses || []).map(t => t.address || t).join(', ');

        await transporter.sendMail({
          from: `"${user.name}" <${user.email}>`,
          to: toAddresses,
          subject: email.subject,
          html: email.body_html,
          text: email.body_text,
        });

        await supabase
          .from('emails')
          .update({ is_scheduled: false, scheduled_at: null, folder: 'sent' })
          .eq('id', email.id);

        sentCount++;
        console.log(`✅ Scheduled email sent: "${email.subject}" to ${toAddresses}`);
      } catch (sendErr) {
        console.error(`❌ Failed scheduled email ${email.id}: ${sendErr.message}`);
      }
    }

    res.json({ message: `Sent ${sentCount} scheduled emails`, count: sentCount });
  } catch (err) {
    console.error('Cron scheduled-send error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${status}: ${err.message}`);
  res.status(status).json({
    message: isProduction ? 'Internal Server Error' : err.message,
  });
});

module.exports = app;
