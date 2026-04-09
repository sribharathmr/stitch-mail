const router = require('express').Router();
const { listAccounts, addAccount, deleteAccount, unifiedInbox } = require('../controllers/accountController');
const auth = require('../middleware/auth');

router.use(auth);
router.get('/unified-inbox', unifiedInbox);
router.get('/', listAccounts);
router.post('/', addAccount);
router.delete('/:id', deleteAccount);

module.exports = router;
