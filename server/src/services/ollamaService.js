const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL || 'phi3';
const TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS) || 30000; // 30s default

/**
 * Calls the local Ollama instance to generate text with timeout protection.
 * @param {string} prompt The full prompt with context and instructions.
 * @param {string} format 'json' if structured output is required.
 * @returns {Promise<string>} The generated text/json string.
 */
async function generateFromOllama(prompt, format = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
        format: format === 'json' ? 'json' : undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`AI request timed out after ${TIMEOUT_MS / 1000}s. The model may be overloaded.`);
    }
    console.error('Error connecting to Ollama:', error.message);
    throw new Error('Could not connect to AI service. Ensure Ollama is running and accessible at ' + OLLAMA_URL);
  }
}

/**
 * Analyzes an email thread and returns structured insights.
 * @param {string} threadContext The full text of the email thread.
 * @returns {Promise<{summary: string, decisions: string[], actionItems: string[]}>}
 */
async function analyzeThreadMemory(threadContext) {
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
    const result = await generateFromOllama(prompt, 'json');
    const parsed = JSON.parse(result);
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
    console.error('Failed to parse Conversation Memory JSON:', e.message);
    return {
      summary: "AI analysis failed. " + e.message,
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
  const prompt = `
You are an expert Intent-Based Email Writer. Write a ${tone} email based on the user's intent: "${intent}".
${context ? `Here is the related previous conversation context:\n${context}` : ''}

Output ONLY the raw content of the email you would write. Do not include subject lines unless requested. Do not include placeholder text like "[Your Name]". Write it ready to send.
`;
  return await generateFromOllama(prompt);
}

/**
 * Analyzes an email body to determine if it is a newsletter or marketing material.
 * @param {string} subject 
 * @param {string} sender 
 * @param {string} bodyText 
 * @returns {Promise<boolean>}
 */
async function isNewsletter(subject, sender, bodyText) {
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
    const result = await generateFromOllama(prompt);
    return result.trim().toUpperCase().includes('YES');
  } catch {
    return false; // Fail safe: don't mark as newsletter if AI is down
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
    const result = await generateFromOllama(prompt);
    const text = result.trim().toUpperCase();
    if (text.includes('SOCIAL')) return 'SOCIAL';
    if (text.includes('PROMOTION')) return 'PROMOTIONS';
    return 'PRIMARY';
  } catch(e) {
    console.error('Categorize error:', e.message);
    return 'PRIMARY';
  }
}

module.exports = {
  analyzeThreadMemory,
  generateDraftIntent,
  isNewsletter,
  categorizeEmail
};
