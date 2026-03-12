const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { findByEmail, findById, addUser } = require('../data/users');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  specialty: user.specialty,
  licenseNumber: user.licenseNumber,
});

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, specialty, licenseNumber } = req.body;

    // Check if user already exists
    const existing = findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = addUser({
      email,
      password: hashedPassword,
      name,
      role: role || 'physician',
      specialty: specialty || null,
      licenseNumber: licenseNumber || null,
      avatar: null,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: sanitizeUser(newUser),
    });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const user = findByEmail(email);

    // Always respond with success to prevent email enumeration
    if (user) {
      // In production: send actual reset email via SMTP
      console.log(`[DEMO] Password reset requested for: ${email}`);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.',
    });
  } catch (err) {
    next(err);
  }
};

exports.me = (req, res) => {
  const user = findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({ success: true, user: sanitizeUser(user) });
};

exports.logout = (_req, res) => {
  // JWT is stateless; client discards the token
  res.json({ success: true, message: 'Logged out successfully' });
};

