const { Router } = require('express');
const { body } = require('express-validator');
const { login, me, logout } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  login
);

router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

module.exports = router;
