/**
 * authRoutes.js - Authentication endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  logout,
  forgotPassword 
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * POST /api/auth/register
 * Register new user
 * Body: { full_name, email, phone_number, password, role }
 */
router.post(
  '/register',
  [
    body('full_name').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone_number').trim().matches(/^[0-9\-\+\(\)]{10,}$/).withMessage('Valid phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['Rider', 'Driver']).withMessage('Role must be Rider or Driver')
  ],
  register
);

/**
 * POST /api/auth/login
 * Login user
 * Body: { email, password }
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  login
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 * Body: { email }
 */
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  forgotPassword
);

// ==================== AUTHENTICATED ROUTES ====================

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * PUT /api/auth/profile
 * Update current user profile
 * Body: { full_name?, phone_number?, profile_photo? }
 */
router.put(
  '/profile',
  authMiddleware,
  [
    body('full_name').optional().trim().isLength({ min: 2 }),
    body('phone_number').optional().trim().matches(/^[0-9\-\+\(\)]{10,}$/),
    body('profile_photo').optional().isURL()
  ],
  updateProfile
);

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', authMiddleware, logout);

module.exports = router;
