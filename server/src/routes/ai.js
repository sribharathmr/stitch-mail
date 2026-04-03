const router = require('express').Router();
const auth = require('../middleware/auth');
const aiCtrl = require('../controllers/aiController');

// ── Public diagnostic endpoint (no auth) ──────────────────────────────────────
router.get('/ping', (req, res) => {
  try {
    const geminiService = require('../services/geminiService');
    const hasKey = !!(process.env.GEMINI_API_KEY);
    res.json({
      status: 'ok',
      geminiServiceLoaded: true,
      geminiKeyConfigured: hasKey,
      nodeEnv: process.env.NODE_ENV || 'unknown',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

router.use(auth);

router.post('/memory/:threadId', aiCtrl.getMemory);
router.post('/draft/intent', aiCtrl.generateIntentDraft);
router.get('/subscriptions', aiCtrl.findSubscriptions);
router.post('/unsubscribe', aiCtrl.unsubscribe);
router.post('/categorize', aiCtrl.categorizeInbox);

module.exports = router;
