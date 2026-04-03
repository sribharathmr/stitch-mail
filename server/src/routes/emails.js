const router = require('express').Router();
const ctrl = require('../controllers/emailController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(auth);

// Order matters - specific routes before parameterized
router.get('/search', ctrl.search);
router.get('/sync', ctrl.sync);
router.get('/tree', ctrl.getTree);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/send', upload.array('attachments'), ctrl.send);
router.post('/draft', upload.array('attachments'), ctrl.draft);
router.patch('/:id', ctrl.update);
router.patch('/:id/tree-override', ctrl.treeOverride);
router.delete('/:id', ctrl.remove);
router.post('/:id/schedule', ctrl.schedule);

module.exports = router;
