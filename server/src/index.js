// Local development entry point — starts the Express server
// In production on Vercel, app.js is imported directly by the serverless function
const app = require('./app');
const bcrypt = require('bcryptjs');

const PORT = parseInt(process.env.PORT) || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

let server;

async function startServer() {
  const supabase = require('./supabase');
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
  } else {
    console.log('✅ Supabase connected successfully');
  }

  // Seed demo data only in development
  if (process.env.NODE_ENV !== 'production') {
    await seedDemo(supabase);
  }

  // Start cron jobs (local dev only — Vercel uses Vercel Cron)
  require('./jobs/scheduledSend');

  server = app.listen(PORT, HOST, () =>
    console.log(`🚀 Server running on http://${HOST}:${PORT} [${process.env.NODE_ENV || 'development'}]`)
  );
}

async function seedDemo(supabase) {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (count > 0) return;

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

  if (userErr) { console.error('Seed user error:', userErr.message); return; }

  const now = new Date();
  const h = (n) => new Date(now - n * 3600000).toISOString();
  const d = (n) => new Date(now - n * 86400000).toISOString();

  const emails = [
    { user_id: david.id, folder: 'inbox', from_address: { name: 'Sarah Kim', address: 'sarah@designteam.io' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'Q3 Design System Review — Action Required', body_html: '<p>Hi David,</p><p>Hope you\'re doing well!</p>', body_text: 'Hi David, follow up on Q3 design system review.', labels: ['DESIGN TEAM'], is_read: false, received_at: h(2), thread_id: 'thread-001' },
    { user_id: david.id, folder: 'inbox', from_address: { name: 'Alex Rivera', address: 'alex.r@agency.com' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'Client Kick-off Call — Foundry Studio Project', body_html: '<p>David! Call is <strong>Friday at 2 PM EST</strong>.</p>', body_text: 'Client kickoff call Friday 2PM EST.', labels: ['ALEX RIVERA'], is_read: false, received_at: h(5), thread_id: 'thread-002' },
    { user_id: david.id, folder: 'inbox', from_address: { name: 'DevOps Team', address: 'devops@atelier.com' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'URGENT: Server Deployment Issue', body_html: '<p><strong style="color:red">URGENT</strong></p>', body_text: 'URGENT: Staging server deployment failure.', is_read: false, is_starred: true, received_at: h(1), thread_id: 'thread-003' },
    { user_id: david.id, folder: 'inbox', from_address: { name: 'Dribbble', address: 'hello@dribbble.com' }, to_addresses: [{ name: 'David Chen', address: david.email }], subject: 'Your shot "Minimal Dashboard UI" got 247 likes!', body_html: '<p>Your shot is trending.</p>', body_text: 'Your shot Minimal Dashboard UI is trending.', labels: ['DRIBBBLE'], is_read: true, received_at: d(1), thread_id: 'thread-004' },
  ];

  const { error: emailErr } = await supabase.from('emails').insert(emails);
  if (emailErr) console.error('Seed email error:', emailErr.message);
  else console.log(`🌱 Demo data seeded — login with david.chen@atelier.com / password123`);
}

function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => { console.log('✅ HTTP server closed'); process.exit(0); });
    setTimeout(() => { console.error('⚠️ Forcefully shutting down'); process.exit(1); }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch(err => { console.error('Failed to start server:', err); process.exit(1); });
