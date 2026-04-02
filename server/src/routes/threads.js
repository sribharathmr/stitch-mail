const router = require('express').Router();
const { getThread } = require('../controllers/threadController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/:threadId', getThread);

module.exports = router;
