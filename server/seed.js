require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Email = require('./src/models/Email');
const Thread = require('./src/models/Thread');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/stitch-mail';

const now = new Date();
const daysAgo = (d) => new Date(now - d * 86400000);
const hoursAgo = (h) => new Date(now - h * 3600000);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clean up
  await Promise.all([User.deleteMany(), Email.deleteMany(), Thread.deleteMany()]);
  console.log('🗑️  Cleared existing data');

  // Create users
  const passwordHash = await bcrypt.hash('password123', 12);
  const david = await User.create({
    name: 'David Chen',
    email: 'david.chen@atelier.com',
    passwordHash,
    avatar: '',
    signature: {
      text: '"Design is not just what it looks like. Design is how it works."',
      name: 'David Chen',
      title: 'Lead Designer, Atelier'
    },
    preferences: { theme: 'light', smartNotifications: true, threadGrouping: false, compactView: true }
  });

  const alice = await User.create({
    name: 'Alice Morgan',
    email: 'alice@atelier.com',
    passwordHash,
    preferences: { theme: 'light', smartNotifications: false, threadGrouping: true, compactView: false }
  });

  console.log('👤 Users created');

  // Helper to create email
  const mkEmail = (data) => ({ userId: david._id, isRead: false, isStarred: false, isScheduled: false, ...data });

  const emails = await Email.insertMany([
    // INBOX - Primary
    mkEmail({
      folder: 'inbox',
      from: { name: 'Sarah Kim', address: 'sarah@designteam.io' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Q3 Design System Review — Action Required',
      bodyHtml: `<p>Hi David,</p><p>Hope you're doing well! I wanted to follow up on the Q3 design system review scheduled for this week.</p><p>Key items we need to cover:</p><ul><li>Component library updates</li><li>Color token standardization</li><li>Typography scale review</li><li>Motion design guidelines</li></ul><p>Please review the Figma file before Thursday's meeting.</p><p>Best,<br>Sarah</p>`,
      bodyText: 'Hi David, Hope you\'re doing well! Key items: Component library updates, Color token standardization, Typography scale review. Please review the Figma file before Thursday. Best, Sarah',
      labels: ['DESIGN TEAM'],
      isRead: false,
      receivedAt: hoursAgo(2),
      createdAt: hoursAgo(2),
      threadId: 'thread-001'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'Alex Rivera', address: 'alex.r@agency.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Client Kick-off Call — Foundry Studio Project',
      bodyHtml: `<p>David!</p><p>Excited to kick things off. The client is Foundry Studio — an emerging architecture firm looking for a complete brand identity overhaul.</p><p>The call is scheduled for <strong>Friday at 2 PM EST</strong>. Please prepare a brief portfolio showcase.</p><p>Talk soon,<br>Alex</p>`,
      bodyText: 'David! Excited to kick things off. Client is Foundry Studio — brand identity overhaul. Call Friday 2PM EST.',
      labels: ['ALEX RIVERA'],
      isRead: false,
      receivedAt: hoursAgo(5),
      createdAt: hoursAgo(5),
      threadId: 'thread-002'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'DevOps Team', address: 'devops@atelier.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'URGENT: Server Deployment Issue — Needs Immediate Attention',
      bodyHtml: `<p style="color:red;"><strong>URGENT</strong></p><p>There's a critical issue with the staging server deployment pipeline. The latest build failed and several services are down.</p><p>Please check the deployment logs and coordinate with the backend team immediately.</p>`,
      bodyText: 'URGENT: Critical issue with staging server deployment pipeline. Latest build failed. Please check immediately.',
      labels: ['URGENT: SERVER'],
      isRead: false,
      isStarred: true,
      receivedAt: hoursAgo(1),
      createdAt: hoursAgo(1),
      threadId: 'thread-003'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'Dribbble', address: 'hello@dribbble.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Your shot "Minimal Dashboard UI" got 247 likes!',
      bodyHtml: `<p>Congrats! Your design shot <strong>"Minimal Dashboard UI"</strong> is trending on Dribbble with 247 likes and 38 saves.</p><p>Keep creating amazing work!</p>`,
      bodyText: 'Your design shot "Minimal Dashboard UI" is trending with 247 likes and 38 saves!',
      labels: ['DRIBBBLE'],
      isRead: true,
      receivedAt: daysAgo(1),
      createdAt: daysAgo(1),
      threadId: 'thread-004'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'Marcus Webb', address: 'marcus@client.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Invoice #2024-089 — Payment Confirmation',
      bodyHtml: `<p>Hi David,</p><p>Just confirming we've processed payment for Invoice #2024-089 ($4,500). You should receive confirmation within 2-3 business days.</p><p>Great work on the project!</p>`,
      bodyText: 'Confirming payment for Invoice #2024-089 ($4,500). Should arrive in 2-3 business days.',
      labels: [],
      isRead: true,
      receivedAt: daysAgo(2),
      createdAt: daysAgo(2),
      threadId: 'thread-005'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'Newsletter', address: 'weekly@designweekly.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Design Weekly: Top 10 UI Trends of 2024',
      bodyHtml: `<p>This week's top design trends including glassmorphism, neobrutalism, and AI-generated UI components.</p>`,
      bodyText: 'Top design trends: glassmorphism, neobrutalism, AI-generated UI components.',
      labels: ['NEWSLETTER'],
      isRead: true,
      receivedAt: daysAgo(3),
      createdAt: daysAgo(3),
      threadId: 'thread-006'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'Priya Sharma', address: 'priya@atelier.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Re: Brand Guidelines Update — Need your feedback',
      bodyHtml: `<p>David, attached the updated brand guidelines PDF. Can you review Section 3 (Color Usage) and Section 5 (Logo Variations) by EOD?</p>`,
      bodyText: 'Attached updated brand guidelines. Please review Section 3 (Color Usage) and Section 5 (Logo Variations) by EOD.',
      labels: [],
      isRead: false,
      receivedAt: hoursAgo(3),
      createdAt: hoursAgo(3),
      attachments: [{ filename: 'brand-guidelines-v3.pdf', mimetype: 'application/pdf', size: 2400000, path: '' }],
      threadId: 'thread-007'
    }),
    mkEmail({
      folder: 'inbox',
      from: { name: 'GitHub', address: 'noreply@github.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: '[stitch-mail] Pull request #42: Add dark mode support',
      bodyHtml: `<p>A pull request was opened in <strong>atelier-team/stitch-mail</strong></p><p>✅ All checks have passed. Ready to merge.</p>`,
      bodyText: 'Pull request #42 opened in atelier-team/stitch-mail. All checks passed.',
      labels: ['GITHUB'],
      isRead: false,
      receivedAt: hoursAgo(4),
      createdAt: hoursAgo(4),
      threadId: 'thread-008'
    }),

    // SENT
    mkEmail({
      folder: 'sent',
      from: { name: 'David Chen', address: 'david.chen@atelier.com' },
      to: [{ name: 'Sarah Kim', address: 'sarah@designteam.io' }],
      subject: 'Re: Q3 Design System Review — Action Required',
      bodyHtml: `<p>Hi Sarah,</p><p>Got it! I'll review the Figma file tonight and come prepared with notes. See you Thursday.</p><p>Best,<br>David</p>`,
      bodyText: 'Will review Figma file tonight. See you Thursday.',
      isRead: true,
      receivedAt: hoursAgo(1),
      createdAt: hoursAgo(1),
      threadId: 'thread-001'
    }),
    mkEmail({
      folder: 'sent',
      from: { name: 'David Chen', address: 'david.chen@atelier.com' },
      to: [{ name: 'Client Team', address: 'team@foundry.io' }],
      subject: 'Foundry Studio — Initial Concepts Ready',
      bodyHtml: `<p>Team,</p><p>I've prepared 3 initial brand directions for your review. Link: figma.com/foundry-concepts</p>`,
      bodyText: '3 initial brand directions ready for review. Link: figma.com/foundry-concepts',
      isRead: true,
      receivedAt: daysAgo(1),
      createdAt: daysAgo(1),
      threadId: 'thread-009'
    }),

    // DRAFTS
    mkEmail({
      folder: 'drafts',
      from: { name: 'David Chen', address: 'david.chen@atelier.com' },
      to: [{ name: 'Marcus Webb', address: 'marcus@client.com' }],
      subject: 'Proposal — Phase 2 Design Work',
      bodyHtml: `<p>Hi Marcus,</p><p>Following our conversation, I'd like to propose Phase 2 of the design work covering:</p><ul><li>Mobile app UI design</li><li>Design system documentation</li></ul>`,
      bodyText: 'Phase 2 proposal covering mobile app UI and design system documentation.',
      isRead: true,
      receivedAt: daysAgo(1),
      createdAt: daysAgo(1),
    }),
    mkEmail({
      folder: 'drafts',
      from: { name: 'David Chen', address: 'david.chen@atelier.com' },
      to: [],
      subject: 'Weekly Design Newsletter — Draft',
      bodyHtml: `<p>This week in design...</p>`,
      bodyText: 'This week in design...',
      isRead: true,
      isScheduled: true,
      scheduledAt: new Date(now.getTime() + 86400000),
      receivedAt: hoursAgo(2),
      createdAt: hoursAgo(2),
    }),

    // STARRED
    mkEmail({
      folder: 'inbox',
      from: { name: 'CEO', address: 'ceo@atelier.com' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Promotion — Lead Design Director',
      bodyHtml: `<p>David, it is with great pleasure that I inform you of your promotion to Lead Design Director effective Q1.</p>`,
      bodyText: 'Promotion to Lead Design Director effective Q1.',
      isRead: true,
      isStarred: true,
      receivedAt: daysAgo(5),
      createdAt: daysAgo(5),
      threadId: 'thread-010'
    }),

    // SPAM
    mkEmail({
      folder: 'spam',
      from: { name: 'Prize Winner', address: 'noreply@prizewinners.xyz' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'You have won $1,000,000!!!',
      bodyHtml: `<p>Congratulations! You've been selected as a prize winner. Click here to claim your reward.</p>`,
      bodyText: 'You\'ve won! Click to claim.',
      isRead: false,
      receivedAt: daysAgo(2),
      createdAt: daysAgo(2),
    }),

    // ARCHIVE
    mkEmail({
      folder: 'archive',
      from: { name: 'Notion', address: 'notify@notion.so' },
      to: [{ name: 'David Chen', address: 'david.chen@atelier.com' }],
      subject: 'Project Roadmap shared with you',
      bodyHtml: `<p>Alex Rivera shared "Q4 Roadmap" with you in Notion.</p>`,
      bodyText: 'Alex Rivera shared Q4 Roadmap with you.',
      isRead: true,
      receivedAt: daysAgo(7),
      createdAt: daysAgo(7),
    }),
  ]);

  console.log(`📧 ${emails.length} emails created`);

  // Create threads
  await Thread.insertMany([
    {
      userId: david._id,
      subject: 'Q3 Design System Review — Action Required',
      participants: [{ name: 'Sarah Kim', address: 'sarah@designteam.io' }, { name: 'David Chen', address: 'david.chen@atelier.com' }],
      emailIds: [emails[0]._id, emails[8]._id],
      lastActivity: hoursAgo(1),
      isRead: false
    },
    {
      userId: david._id,
      subject: 'Client Kick-off Call — Foundry Studio Project',
      participants: [{ name: 'Alex Rivera', address: 'alex.r@agency.com' }, { name: 'David Chen', address: 'david.chen@atelier.com' }],
      emailIds: [emails[1]._id],
      lastActivity: hoursAgo(5),
      isRead: false
    }
  ]);

  console.log('🧵 Threads created');
  console.log('\n✨ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Login credentials:');
  console.log('  Email:    david.chen@atelier.com');
  console.log('  Password: password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
