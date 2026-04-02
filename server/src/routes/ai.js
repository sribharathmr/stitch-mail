const router = require('express').Router();
const auth = require('../middleware/auth');
const aiCtrl = require('../controllers/aiController');

router.use(auth);

router.post('/memory/:threadId', aiCtrl.getMemory);
router.post('/draft/intent', aiCtrl.generateIntentDraft);
router.get('/subscriptions', aiCtrl.findSubscriptions);
router.post('/unsubscribe', aiCtrl.unsubscribe);
router.post('/categorize', aiCtrl.categorizeInbox);

module.exports = router;
