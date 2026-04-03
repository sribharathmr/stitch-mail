const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Configuration ──────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-1.5-flash';

let genAI = null;
let model = null;

function getModel() {
  if (!model && GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: MODEL_NAME });
  }
  return model;
}

// ── Well-Known Domains Dictionary (~120 entries) ───────────────────────────────
const KNOWN_DOMAINS = {
  'google.com': 'Google', 'gmail.com': 'Google (Personal)', 'googlemail.com': 'Google',
  'youtube.com': 'YouTube', 'android.com': 'Google Android',
  'microsoft.com': 'Microsoft', 'outlook.com': 'Microsoft (Personal)', 'hotmail.com': 'Microsoft (Personal)',
  'live.com': 'Microsoft (Personal)', 'msn.com': 'Microsoft',
  'apple.com': 'Apple', 'icloud.com': 'Apple (Personal)', 'me.com': 'Apple (Personal)',
  'amazon.com': 'Amazon', 'aws.amazon.com': 'Amazon Web Services',
  'facebook.com': 'Meta', 'fb.com': 'Meta', 'instagram.com': 'Instagram (Meta)',
  'meta.com': 'Meta', 'whatsapp.com': 'WhatsApp (Meta)',
  'twitter.com': 'X (Twitter)', 'x.com': 'X',
  'linkedin.com': 'LinkedIn', 'github.com': 'GitHub', 'gitlab.com': 'GitLab',
  'slack.com': 'Slack', 'zoom.us': 'Zoom', 'zoom.com': 'Zoom',
  'notion.so': 'Notion', 'notion.com': 'Notion',
  'figma.com': 'Figma', 'dribbble.com': 'Dribbble', 'behance.net': 'Behance',
  'stripe.com': 'Stripe', 'paypal.com': 'PayPal', 'square.com': 'Square',
  'shopify.com': 'Shopify', 'woocommerce.com': 'WooCommerce',
  'salesforce.com': 'Salesforce', 'hubspot.com': 'HubSpot',
  'atlassian.com': 'Atlassian', 'jira.com': 'Atlassian (Jira)',
  'trello.com': 'Trello', 'asana.com': 'Asana', 'monday.com': 'Monday.com',
  'dropbox.com': 'Dropbox', 'box.com': 'Box',
  'netflix.com': 'Netflix', 'spotify.com': 'Spotify', 'hulu.com': 'Hulu',
  'uber.com': 'Uber', 'lyft.com': 'Lyft',
  'airbnb.com': 'Airbnb', 'booking.com': 'Booking.com',
  'tesla.com': 'Tesla', 'spacex.com': 'SpaceX',
  'nvidia.com': 'NVIDIA', 'amd.com': 'AMD', 'intel.com': 'Intel',
  'ibm.com': 'IBM', 'oracle.com': 'Oracle', 'sap.com': 'SAP',
  'adobe.com': 'Adobe', 'canva.com': 'Canva',
  'twitch.tv': 'Twitch', 'discord.com': 'Discord', 'reddit.com': 'Reddit',
  'medium.com': 'Medium', 'substack.com': 'Substack',
  'vercel.com': 'Vercel', 'netlify.com': 'Netlify', 'heroku.com': 'Heroku',
  'digitalocean.com': 'DigitalOcean', 'cloudflare.com': 'Cloudflare',
  'mongodb.com': 'MongoDB', 'supabase.com': 'Supabase', 'firebase.google.com': 'Firebase',
  'docker.com': 'Docker', 'kubernetes.io': 'Kubernetes',
  'npmjs.com': 'npm', 'pypi.org': 'PyPI',
  'stackoverflow.com': 'Stack Overflow', 'dev.to': 'DEV Community',
  'hashicorp.com': 'HashiCorp', 'datadog.com': 'Datadog',
  'twilio.com': 'Twilio', 'sendgrid.com': 'SendGrid (Twilio)',
  'mailchimp.com': 'Mailchimp', 'convertkit.com': 'ConvertKit',
  'intercom.com': 'Intercom', 'zendesk.com': 'Zendesk', 'freshdesk.com': 'Freshdesk',
  'grammarly.com': 'Grammarly', '1password.com': '1Password',
  'coinbase.com': 'Coinbase', 'binance.com': 'Binance',
  'producthunt.com': 'Product Hunt', 'ycombinator.com': 'Y Combinator',
  'harvard.edu': 'Harvard University', 'mit.edu': 'MIT', 'stanford.edu': 'Stanford University',
  'nytimes.com': 'The New York Times', 'washingtonpost.com': 'The Washington Post',
  'bbc.co.uk': 'BBC', 'bbc.com': 'BBC', 'cnn.com': 'CNN',
  'yahoo.com': 'Yahoo', 'aol.com': 'AOL',
  'samsung.com': 'Samsung', 'sony.com': 'Sony', 'lg.com': 'LG',
  'dell.com': 'Dell', 'hp.com': 'HP', 'lenovo.com': 'Lenovo',
  'cisco.com': 'Cisco', 'vmware.com': 'VMware',
  'tiktok.com': 'TikTok', 'snapchat.com': 'Snapchat', 'pinterest.com': 'Pinterest',
  'quora.com': 'Quora', 'wikipedia.org': 'Wikipedia',
  'wix.com': 'Wix', 'squarespace.com': 'Squarespace', 'wordpress.com': 'WordPress',
  'godaddy.com': 'GoDaddy', 'namecheap.com': 'Namecheap',
  'chase.com': 'JPMorgan Chase', 'bankofamerica.com': 'Bank of America',
  'wellsfargo.com': 'Wells Fargo', 'citi.com': 'Citibank',
  'goldmansachs.com': 'Goldman Sachs', 'morganstanley.com': 'Morgan Stanley',
};

// Personal email domains — group as "Personal Contacts"
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'yandex.com', 'mail.com', 'gmx.com', 'gmx.net',
  'fastmail.com', 'tutanota.com', 'hey.com', 'pm.me',
]);

/**
 * Extracts the domain from an email address.
 */
function extractDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase().trim() : '';
}

/**
 * Converts a domain into a human-readable organization name.
 * Uses: known dictionary → domain parsing → Gemini AI fallback.
 */
async function resolveOrgName(domain) {
  if (!domain) return 'Unknown';

  // 1. Check known domains dictionary
  if (KNOWN_DOMAINS[domain]) {
    return KNOWN_DOMAINS[domain];
  }

  // 2. Check if it's a personal email domain
  if (PERSONAL_DOMAINS.has(domain)) {
    return 'Personal Contacts';
  }

  // 3. Smart domain parsing: remove TLD, capitalize
  const parsed = domainToOrgName(domain);

  // 4. If Gemini API key is available, use AI for better resolution
  const geminiModel = getModel();
  if (geminiModel) {
    try {
      const result = await geminiModel.generateContent(
        `What company or organization uses the email domain "${domain}"? ` +
        `Reply with ONLY the organization name (e.g., "Acme Corporation"). ` +
        `If you don't know, reply with "${parsed}".`
      );
      const text = result.response.text().trim();
      // Sanity check: if it's too long or looks weird, use parsed version
      if (text && text.length < 60 && !text.includes('\n')) {
        return text;
      }
    } catch (err) {
      console.error('Gemini org resolution fallback error:', err.message);
    }
  }

  return parsed;
}

/**
 * Converts a domain string to a readable org name.
 * e.g., "acme-corp.co" → "Acme Corp", "my-startup.io" → "My Startup"
 */
function domainToOrgName(domain) {
  // Remove common TLDs
  const tlds = ['.com', '.org', '.net', '.io', '.co', '.ai', '.dev', '.app', '.tech', '.xyz', '.me', '.so', '.ly', '.to'];
  let name = domain;
  for (const tld of tlds) {
    if (name.endsWith(tld)) {
      name = name.slice(0, -tld.length);
      break;
    }
  }
  // Handle multi-part TLDs like .co.uk
  if (name.endsWith('.co')) name = name.slice(0, -3);

  // Replace separators and capitalize
  return name
    .replace(/[-_.]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || domain;
}

/**
 * Builds a hierarchical tree from a flat list of emails.
 * Returns: Array of org nodes, each containing contact nodes with email leaves.
 */
async function buildEmailTree(emails, searchQuery = '') {
  // Filter by search query if provided
  let filtered = emails;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = emails.filter(e =>
      (e.from_address?.name || '').toLowerCase().includes(q) ||
      (e.from_address?.address || '').toLowerCase().includes(q) ||
      (e.subject || '').toLowerCase().includes(q) ||
      (e.body_text || '').toLowerCase().includes(q)
    );
  }

  // Group emails by domain (or tree_org_override if set)
  const domainMap = new Map();

  for (const email of filtered) {
    const address = email.from_address?.address || '';
    const domain = email.tree_org_override || extractDomain(address);

    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain).push(email);
  }

  // Build tree structure
  const tree = [];
  const orgNameCache = new Map();

  for (const [domain, domainEmails] of domainMap) {
    // Resolve org name (with caching)
    let orgName;
    if (orgNameCache.has(domain)) {
      orgName = orgNameCache.get(domain);
    } else {
      orgName = await resolveOrgName(domain);
      orgNameCache.set(domain, orgName);
    }

    // Group by contact within this domain
    const contactMap = new Map();
    for (const email of domainEmails) {
      const contactKey = email.from_address?.address || 'unknown';
      if (!contactMap.has(contactKey)) {
        contactMap.set(contactKey, {
          name: email.from_address?.name || contactKey,
          address: contactKey,
          emails: [],
        });
      }
      contactMap.get(contactKey).emails.push(email);
    }

    // Sort contacts: most recent first
    const contacts = Array.from(contactMap.values()).map(contact => {
      contact.emails.sort((a, b) =>
        new Date(b.received_at || b.created_at) - new Date(a.received_at || a.created_at)
      );
      return contact;
    });

    // Compute priority metrics
    const totalEmails = domainEmails.length;
    const unreadCount = domainEmails.filter(e => !e.is_read).length;
    const starredCount = domainEmails.filter(e => e.is_starred).length;
    const mostRecent = domainEmails.reduce((latest, e) => {
      const d = new Date(e.received_at || e.created_at);
      return d > latest ? d : latest;
    }, new Date(0));

    // Priority score: higher = more important
    const priorityScore = (unreadCount * 3) + (starredCount * 5) +
      (Date.now() - mostRecent.getTime() < 86400000 ? 10 : 0); // bonus for today

    tree.push({
      domain,
      orgName,
      totalEmails,
      unreadCount,
      starredCount,
      priorityScore,
      mostRecentAt: mostRecent.toISOString(),
      contactCount: contacts.length,
      contacts: contacts.map(c => ({
        ...c,
        emailCount: c.emails.length,
        unreadCount: c.emails.filter(e => !e.is_read).length,
      })),
    });
  }

  // Sort tree: highest priority first, then by most recent
  tree.sort((a, b) => b.priorityScore - a.priorityScore || new Date(b.mostRecentAt) - new Date(a.mostRecentAt));

  return tree;
}

/**
 * Analyzes an email thread and returns structured insights.
 * @param {string} threadContext The full text of the email thread.
 * @returns {Promise<{summary: string, decisions: string[], actionItems: string[]}>}
 */
async function analyzeThreadMemory(threadContext) {
  const model = getModel();
  if (!model) return { summary: 'AI unavailable. Missing API Key.', decisions: [], actionItems: [] };

  const prompt = `
You are an advanced Conversation Memory AI for an email client.
Analyze the following email thread context and extract the main points.

Thread Context:
${threadContext}

Provide your response in strict JSON format with exactly the following schema:
{
  "summary": "A 2-3 sentence summary of the entire conversation.",
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": ["Action 1 with owner if specified", "Action 2"]
}
Only output valid JSON, absolutely no extra text.
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const parsed = JSON.parse(text);
    const toStringItem = (item) => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).filter(v => typeof v === 'string' && v.trim()).join(' — ');
      }
      return String(item);
    };
    const toArray = (val) => {
      if (Array.isArray(val)) return val.map(toStringItem).filter(Boolean);
      if (typeof val === 'string' && val.trim()) return [val];
      return [];
    };
    return {
      summary: String(parsed.summary || 'No summary available.'),
      decisions: toArray(parsed.decisions),
      actionItems: toArray(parsed.actionItems || parsed.action_items),
    };
  } catch (e) {
    console.error('Failed to parse Conversation Memory JSON from Gemini:', e.message);
    // Friendly message for quota/rate-limit errors
    const isQuota = e.message && (e.message.includes('429') || e.message.includes('quota') || e.message.includes('Too Many'));
    return {
      summary: isQuota
        ? 'Gemini API quota exceeded. Please wait a moment and try again, or check your Google AI Studio billing settings.'
        : 'AI analysis failed. ' + e.message,
      decisions: [],
      actionItems: []
    };
  }
}

/**
 * Generates an intent-based email draft.
 * @param {string} intent The desired action (e.g., "Ask for leave").
 * @param {string} tone Formal or casual.
 * @param {string} context Any previous thread history (optional).
 * @returns {Promise<string>}
 */
async function generateDraftIntent(intent, tone, context = '') {
  const model = getModel();
  if (!model) return 'AI unavailable (Missing API Key).';

  const prompt = `
You are an expert Intent-Based Email Writer. Write a ${tone} email based on the user's intent: "${intent}".
${context ? `Here is the related previous conversation context:\n${context}` : ''}

Output ONLY the raw content of the email you would write. Do not include subject lines unless requested. Do not include placeholder text like "[Your Name]". Write it ready to send.
`;
  try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
  } catch (e) {
      console.error('Gemini Draft Error:', e.message);
      const isQuota = e.message && (e.message.includes('429') || e.message.includes('quota') || e.message.includes('Too Many'));
      return isQuota
        ? 'Gemini API quota exceeded. Please wait a moment and try again.'
        : 'AI failed to generate draft. ' + e.message;
  }
}

/**
 * Analyzes an email body to determine if it is a newsletter or marketing material.
 * @param {string} subject 
 * @param {string} sender 
 * @param {string} bodyText 
 * @returns {Promise<boolean>}
 */
async function isNewsletter(subject, sender, bodyText) {
  const model = getModel();
  if (!model) return false;

  const preview = (bodyText || '').substring(0, 1000);
  
  const prompt = `
Analyze the following email metadata and content to determine if this is an automated promotional list, a mass newsletter, or marketing material.

Sender: ${sender}
Subject: ${subject}
Content snippet:
${preview}

Answer only with a single word: YES if it is a mass newsletter/promotional, or NO if it is a standard personal/transactional email.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().toUpperCase().includes('YES');
  } catch (e) {
    console.error('Gemini isNewsletter Error:', e.message);
    return false;
  }
}

/**
 * Categorizes an email into PRIMARY, SOCIAL, or PROMOTIONS.
 * @param {string} subject 
 * @param {string} sender 
 * @param {string} bodyText 
 * @returns {Promise<string>}
 */
async function categorizeEmail(subject, sender, bodyText) {
  const model = getModel();
  if (!model) return 'PRIMARY';

  const preview = (bodyText || '').substring(0, 500);
  
  const prompt = `
Analyze the following email metadata and content to categorize it into exactly one of three categories: "PRIMARY", "SOCIAL", or "PROMOTIONS".

Categories Description:
- PRIMARY: Important personal emails, direct messages from people, work-related emails, urgently required actions.
- SOCIAL: Notifications from social networks, GitHub, Dribbble, Twitter, project management tools, etc.
- PROMOTIONS: Newsletters, marketing emails, discount offers, automated lists.

Sender: ${sender}
Subject: ${subject}
Content snippet:
${preview}

Answer with exactly one word: PRIMARY, SOCIAL, or PROMOTIONS.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toUpperCase();
    if (text.includes('SOCIAL')) return 'SOCIAL';
    if (text.includes('PROMOTION')) return 'PROMOTIONS';
    return 'PRIMARY';
  } catch(e) {
    console.error('Categorize error:', e.message);
    return 'PRIMARY';
  }
}

module.exports = {
  resolveOrgName,
  extractDomain,
  buildEmailTree,
  KNOWN_DOMAINS,
  PERSONAL_DOMAINS,
  analyzeThreadMemory,
  generateDraftIntent,
  isNewsletter,
  categorizeEmail
};
