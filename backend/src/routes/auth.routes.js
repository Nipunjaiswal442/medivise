const { Router } = require('express');
const { body } = require('express-validator');
const { login, register, forgotPassword, me, logout } = require('../controllers/auth.controller');
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

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['physician', 'nurse', 'admin', 'pharmacist']).withMessage('Invalid role'),
    body('specialty').optional().trim(),
    body('licenseNumber').optional().trim(),
  ],
  register
);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  ],
  forgotPassword
);

router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

module.exports = router;
