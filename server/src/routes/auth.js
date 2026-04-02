const router = require('express').Router();
const { register, login, logout, me } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', auth, me);

// Google OAuth routes
const { googleAuth, googleAuthCallback } = require('../controllers/authController');
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

module.exports = router;
