require('dotenv').config();
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
  process.exit(1);
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
  contentSecurityPolicy: false, // Allow inline styles for email HTML rendering
}));

// ─── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Trust proxy (Railway/Vercel set X-Forwarded-For) ──────────────────────────
app.set('trust proxy', 1);

// ─── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

  // Check Supabase
  try {
    const supabase = require('./supabase');
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = error ? 'error' : 'ok';
  } catch {
    checks.database = 'error';
  }

  // Check Ollama
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

// ─── Serve frontend in production ──────────────────────────────────────────────
if (isProduction) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${status}: ${err.message}`);
  if (!isProduction) console.error(err.stack);

  res.status(status).json({
    message: isProduction ? 'Internal Server Error' : err.message,
  });
});

// ─── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
const HOST = isProduction ? '0.0.0.0' : '127.0.0.1';

let server;

async function startServer() {
  // Verify Supabase connection
  const supabase = require('./supabase');
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.log('💡 Make sure you have run the SQL schema in the Supabase SQL Editor');
    console.log('💡 Check SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env');
  } else {
    console.log('✅ Supabase connected successfully');
  }

  // Seed demo data only in development
  if (!isProduction) {
    await seedDemo(supabase);
  }

  // Start scheduled jobs
  require('./jobs/scheduledSend');

  server = app.listen(PORT, HOST, () =>
    console.log(`🚀 Server running on http://${HOST}:${PORT} [${process.env.NODE_ENV || 'development'}]`)
  );
}

// ─── Demo seeding ──────────────────────────────────────────────────────────────
async function seedDemo(supabase) {
  const bcrypt = require('bcryptjs');

  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (count > 0) return; // already seeded

  const passwordHash = await bcrypt.hash('password123', 12);
  const { data: david, error: userErr } = await supabase
    .from('users')
    .insert({
      name: 'David Chen',
      email: 'david.chen@atelier.com',
      password_hash: passwordHash,
      signature: { text: '"Design is not just what it looks like. Design is how it works."', name: 'David Chen', title: 'Lead Designer, Atelier' },
      preferences: { theme: 'light', smartNotifications: true, threadGrouping: false, compactView: true },
    })
    .select()
    .single();

  if (userErr) {
    console.error('Seed user error:', userErr.message);
    return;
  }

  const now = new Date();
  const h = (n) => new Date(now - n * 3600000).toISOString();
  const d = (n) => new Date(now - n * 86400000).toISOString();

  const emails = [
    { user_id: david.id, folder: 'inbox', from_address: { name: 'Sarah Kim', address: 'sarah@designteam.io' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'Q3 Design System Review — Action Required', body_html: '<p>Hi David,</p><p>Hope you\'re doing well! I wanted to follow up on the Q3 design system review.</p><ul><li>Component library updates</li><li>Color token standardization</li><li>Typography scale review</li></ul><p>Please review the Figma file before Thursday.</p><p>Best,<br>Sarah</p>', body_text: 'Hi David, follow up on Q3 design system review.', labels: ['DESIGN TEAM'], is_read: false, received_at: h(2), thread_id: 'thread-001' },
    { user_id: david.id, folder: 'inbox', from_address: { name: 'Alex Rivera', address: 'alex.r@agency.com' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'Client Kick-off Call — Foundry Studio Project', body_html: '<p>David!</p><p>Excited to kick things off. The call is <strong>Friday at 2 PM EST</strong>.</p>', body_text: 'Client kickoff call Friday 2PM EST.', labels: ['ALEX RIVERA'], is_read: false, received_at: h(5), thread_id: 'thread-002' },
    { user_id: david.id, folder: 'inbox', from_address: { name: 'DevOps Team', address: 'devops@atelier.com' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'URGENT: Server Deployment Issue', body_html: '<p><strong style="color:red">URGENT</strong></p><p>Critical issue with the staging server deployment pipeline.</p>', body_text: 'URGENT: Staging server deployment failure.', is_read: false, is_starred: true, received_at: h(1), thread_id: 'thread-003' },
    { user_id: david.id, folder: 'inbox', from_address: { name: 'Dribbble', address: 'hello@dribbble.com' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'Your shot "Minimal Dashboard UI" got 247 likes!', body_html: '<p>Your design shot <strong>"Minimal Dashboard UI"</strong> is trending.</p>', body_text: 'Your shot Minimal Dashboard UI is trending.', labels: ['DRIBBBLE'], is_read: true, received_at: d(1), thread_id: 'thread-004' },
    { user_id: david.id, folder: 'sent', from_address: { name: 'David Chen', address: david.email }, to_addresses: [{ name: 'Sarah Kim', address: 'sarah@designteam.io' }], subject: 'Re: Q3 Design System Review', body_html: '<p>Got it! I\'ll review the Figma file tonight.</p>', body_text: 'Will review Figma tonight.', is_read: true, received_at: h(1), thread_id: 'thread-001' },
    { user_id: david.id, folder: 'drafts', from_address: { name: 'David Chen', address: david.email }, to_addresses: [{ name: 'Marcus Webb', address: 'marcus@client.com' }], subject: 'Proposal — Phase 2 Design Work', body_html: '<p>Hi Marcus, here\'s my Phase 2 proposal.</p>', body_text: 'Phase 2 proposal.', is_read: true, received_at: d(1) },
  ];

  const { error: emailErr } = await supabase.from('emails').insert(emails);
  if (emailErr) console.error('Seed email error:', emailErr.message);
  else console.log(`🌱 Demo data seeded — login with david.chen@atelier.com / password123`);
}

// ─── Graceful shutdown ─────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
      console.error('⚠️ Forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
