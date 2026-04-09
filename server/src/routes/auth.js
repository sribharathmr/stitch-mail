const router = require('express').Router();
const { register, login, logout, me } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', auth, me);

// Google OAuth routes
const { googleAuth, googleAuthCallback, googleLink, googleLinkCallback } = require('../controllers/authController');
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Linking secondary accounts
router.get('/google/link', auth, googleLink);
router.get('/google/link/callback', auth, googleLinkCallback);

module.exports = router;
