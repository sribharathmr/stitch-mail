import winkNBTC from 'wink-naive-bayes-text-classifier';
import { aiAPI } from '../api';

/**
 * Stitch Mail — 3-Layer Hybrid Inbox Classifier
 * Rules -> Naive Bayes (Cross-device learned) -> AI Fallback (Gemini)
 */

// ══════════════════════════════════════════════════════════════
// LAYER 1 — RULE ENGINE
// ══════════════════════════════════════════════════════════════

const RULES = {
  social: {
    domains: [
      'facebook.com','facebookmail.com','twitter.com','x.com',
      'instagram.com','linkedin.com','pinterest.com','tiktok.com',
      'snapchat.com','reddit.com','discord.com','youtube.com',
      'meetup.com','quora.com','tumblr.com','github.com','gitlab.com'
    ],
    subjects: [
      'friend request','followed you','mentioned you','tagged you',
      'connection request','wants to connect','new follower',
      'accepted your','invited you','liked your','commented on',
      'issue assigned', 'pull request', 'repo', 'merged'
    ],
    body: [
      'view profile','sent you a message','join my network',
      'new message from','added you',
    ],
  },
  promotions: {
    domains: [
      'mailchimp.com','sendgrid.net','klaviyo.com','constantcontact.com',
      'campaignmonitor.com','hubspot.com','brevo.com','drip.com',
      'convertkit.com','activecampaign.com','omnisend.com','subscribepage.com'
    ],
    subjects: [
      '% off','sale','deal','coupon','promo','voucher','discount',
      'offer','flash sale','limited time','exclusive','free shipping',
      'shop now','buy now','clearance','save up to','gift','reward',
    ],
    body: [
      'unsubscribe','opt out','opt-out','view in browser',
      'email preferences','manage preferences','click here to buy',
      'add to cart','check out our','newsletter',
    ],
    headers: ['list-unsubscribe','list-id','x-mailchimp-id','x-campaign'],
  },
  updates: {
    domains: [
      'stripe.com','paypal.com','razorpay.com',
      'amazon.com','flipkart.com','zomato.com','swiggy.com','uber.com',
      'irctc.co.in','makemytrip.com','google.com','apple.com',
      'zoom.us','calendly.com','jira.atlassian.com','linear.app',
      'notion.so','trello.com','asana.com','monday.com',
    ],
    subjects: [
      'order','invoice','receipt','payment','booking','confirmed',
      'shipped','delivered','otp','verify','reset','security alert',
      'new sign-in','statement','renewal','expires','subscription',
      'ticket','itinerary','check-in','action required','reminder',
      'deployment','alert','notification'
    ],
    body: [
      'your order','out for delivery','transaction id','payment received',
      'password reset','verify your email','account activity',
      'login attempt','your account','bill is ready',
    ],
    senders: [
      'noreply','no-reply','donotreply','notifications@',
      'alerts@','support@','billing@','receipts@','mailer@',
      'info@','hello@','team@',
    ],
  },
};

function extractDomain(from = '') {
  const m = from.match(/@([\w.-]+)/);
  return m ? m[1].toLowerCase() : '';
}

function norm(t = '') {
  return t.toLowerCase().replace(/\s+/g, ' ').trim();
}

function hits(text, list) {
  const t = norm(text);
  return list.reduce((n, kw) => n + (t.includes(norm(kw)) ? 1 : 0), 0);
}

function domainIn(domain, list) {
  return list.some(d => domain === d || domain.endsWith('.' + d));
}

export function ruleScore(email) {
  const from    = norm(email.from?.address || email.from || '');
  const subject = norm(email.subject || '');
  const body    = norm(email.bodyText || email.body || '');
  const headers = email.headers || {};
  const domain  = extractDomain(from);
  const blob    = subject + ' ' + body;

  const score = { primary: 0, social: 0, updates: 0, promotions: 0 };

  // — Social —
  if (domainIn(domain, RULES.social.domains))         score.social += 10;
  score.social += hits(subject, RULES.social.subjects) * 4;
  score.social += hits(blob,    RULES.social.body)     * 2;

  // — Promotions —
  if (domainIn(domain, RULES.promotions.domains))     score.promotions += 8;
  if (RULES.promotions.headers.some(h => headers[h])) score.promotions += 7;
  if (blob.includes('unsubscribe'))                   score.promotions += 8;
  score.promotions += hits(subject, RULES.promotions.subjects) * 4;
  score.promotions += hits(blob,    RULES.promotions.body)     * 2;

  // — Updates —
  if (domainIn(domain, RULES.updates.domains))        score.updates += 7;
  if (RULES.updates.senders.some(s => from.includes(s))) score.updates += 5;
  score.updates += hits(subject, RULES.updates.subjects) * 4;
  score.updates += hits(blob,    RULES.updates.body)     * 2;

  const max = Math.max(score.social, score.updates, score.promotions);
  const THRESHOLD = 6;

  if (max < THRESHOLD) {
    return { tab: 'primary', confidence: 0.9, scores: score };
  }

  let tab = 'primary';
  if (score.social >= score.updates && score.social >= score.promotions) tab = 'social';
  else if (score.promotions > score.social && score.promotions >= score.updates) tab = 'promotions';
  else if (score.updates > score.social && score.updates > score.promotions) tab = 'updates';

  const sorted = Object.values(score).sort((a, b) => b - a);
  const confidence = sorted[0] > 0
    ? Math.min(0.95, (sorted[0] - (sorted[1] || 0)) / sorted[0] + 0.4)
    : 0.5;

  return { tab, confidence, scores: score };
}


// ══════════════════════════════════════════════════════════════
// LAYER 2 — NAIVE BAYES (wink-nlp)
// ══════════════════════════════════════════════════════════════

const nb = winkNBTC();

nb.definePrepTasks([
  (t) => t.toLowerCase(),
  (t) => t.replace(/[^a-z0-9 ]/g, ' '),
  (t) => t.split(/\s+/).filter(w => w.length > 2),
]);

const SEED = [
  { text: 'hey are you free for lunch tomorrow catch up', label: 'primary' },
  { text: 'meeting rescheduled can we talk this afternoon', label: 'primary' },
  { text: 'quick question about the project timeline', label: 'primary' },
  { text: 'accepted your connection request linkedin network', label: 'social' },
  { text: 'liked your photo instagram new follower', label: 'social' },
  { text: 'tagged you in a post facebook notification', label: 'social' },
  { text: 'your order has shipped track delivery invoice receipt', label: 'updates' },
  { text: 'payment received stripe transaction confirmation', label: 'updates' },
  { text: 'otp verification code your account login', label: 'updates' },
  { text: 'sale ends tonight 50 off discount coupon code', label: 'promotions' },
  { text: 'unsubscribe exclusive offer limited time deal shop now', label: 'promotions' },
  { text: 'newsletter weekly digest our latest products', label: 'promotions' },
];

let nbReady = false;

async function initNB() {
  if (nbReady) return;

  // 1. Seed
  SEED.forEach(({ text, label }) => nb.learn(text, label));

  // 2. Load corrections from Supabase
  try {
    const { data } = await aiAPI.getCorrections();
    if (data?.corrections) {
      data.corrections.forEach(({ text, label }) => nb.learn(norm(text), label));
    }
  } catch (err) {
    console.warn('Failed to load corrections from server, falling back to local seed.', err);
  }

  nb.consolidate();
  nbReady = true;
}

export async function nbClassify(email) {
  await initNB();
  const text = [email.subject || '', email.bodyText?.slice(0, 500) || ''].join(' ');
  const result = nb.computeOdds(text);

  if (!result) return { tab: 'primary', confidence: 0.5 };

  const tab = result.label;
  const odds = result.odds || {};
  const vals = Object.values(odds);
  const max  = Math.max(...vals);
  const sum  = vals.reduce((a, b) => a + b, 0);
  const confidence = sum > 0 ? max / sum : 0.5;

  return { tab, confidence };
}

export async function learnCorrection(email, correctTab) {
  const text = norm([email.subject || '', (email.bodyText || email.body || '').slice(0, 500)].join(' '));

  // 1. Save to backend for cross-device sync
  try {
    await aiAPI.saveCorrection({ text, label: correctTab });
  } catch (err) {
    console.error('Failed to sync correction to server:', err);
  }

  // 2. Retrain local model
  nbReady = false; 
  await initNB();
}


// ══════════════════════════════════════════════════════════════
// LAYER 3 — AI FALLBACK (Gemini)
// ══════════════════════════════════════════════════════════════

export async function aiClassify(email) {
  try {
    const { data } = await aiAPI.categorizeSingle({
      subject: email.subject,
      sender: email.from?.address || email.from,
      body: email.bodyText || email.body
    });
    return (data.category || 'PRIMARY').toLowerCase();
  } catch {
    return 'primary';
  }
}


// ══════════════════════════════════════════════════════════════
// MAIN HYBRID CLASSIFIER
// ══════════════════════════════════════════════════════════════

const CONFIDENCE_THRESHOLD = 0.72;

export async function classifyEmail(email) {
  // L1: Rules
  const r1 = ruleScore(email);
  if (r1.confidence >= CONFIDENCE_THRESHOLD) {
    return { tab: r1.tab, layer: 1, confidence: r1.confidence };
  }

  // L2: Naive Bayes
  const r2 = await nbClassify(email);
  if (r2.confidence >= CONFIDENCE_THRESHOLD) {
    return { tab: r2.tab, layer: 2, confidence: r2.confidence };
  }

  // Agreement
  if (r1.tab === r2.tab) {
    return { tab: r1.tab, layer: 2, confidence: Math.max(r1.confidence, r2.confidence) };
  }

  // L3: AI Fallback
  const tab = await aiClassify(email);
  return { tab, layer: 3, confidence: 0.95 };
}

export async function segregateInbox(emails, onUpdate) {
  const tabs = { primary: [], social: [], updates: [], promotions: [] };

  // Pass 1: instant rule-based (sync)
  emails.forEach(email => {
    const { tab } = ruleScore(email);
    email._tab = tab;
    tabs[tab].push(email);
  });

  // Pass 2: refine in background
  const uncertain = emails.filter(e => {
    const { confidence } = ruleScore(e);
    return confidence < CONFIDENCE_THRESHOLD;
  });

  // Process in background without blocking
  (async () => {
    for (const email of uncertain) {
      const { tab: newTab } = await classifyEmail(email);
      if (newTab !== email._tab) {
        onUpdate?.(email._id || email.id, newTab);
      }
    }
  })();

  return tabs;
}
