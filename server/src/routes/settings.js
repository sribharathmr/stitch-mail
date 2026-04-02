const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/', getSettings);
router.patch('/', updateSettings);

module.exports = router;
