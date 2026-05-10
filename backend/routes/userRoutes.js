// User Routes
// RESTful endpoints for user management

const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin, requireAdminOrSelf } = require('../middleware/roleMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * GET /api/users/:id
 * Get user profile by ID
 * Accessible by: the user themselves or admin
 */
router.get(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  userController.getProfile
);

/**
 * GET /api/users
 * List all users with optional filters
 * Admin only
 */
router.get(
  '/',
  authMiddleware,
  requireAdmin,
  query('role').optional().isIn(['Admin', 'Rider', 'Driver']),
  query('status').optional().isIn(['Active', 'Suspended', 'Deleted']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('search').optional().isString().trim(),
  userController.getAllUsers
);

/**
 * PUT /api/users/:id/profile
 * Update user's own profile
 * User can update: full_name, phone_number, profile_photo
 */
router.put(
  '/:id/profile',
  authMiddleware,
  param('id').isInt().toInt(),
  body('full_name').optional().isString().trim().isLength({ min: 2, max: 100 }),
  body('phone_number').optional().isMobilePhone(),
  body('profile_photo').optional().isURL(),
  userController.updateProfile
);

/**
 * PUT /api/users/:id/status
 * Change user account status
 * Admin only
 */
router.put(
  '/:id/status',
  authMiddleware,
  requireAdmin,
  body('userId').isInt().toInt(),
  body('status').isIn(['Active', 'Suspended', 'Deleted']),
  userController.updateAccountStatus
);

/**
 * GET /api/users/stats/summary
 * Get user statistics
 * Admin only
 */
router.get(
  '/stats/summary',
  authMiddleware,
  requireAdmin,
  userController.getUserStatistics
);

/**
 * DELETE /api/users/:id
 * Delete user (soft delete)
 * Admin only
 */
router.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  param('id').isInt().toInt(),
  userController.deleteUser
);

/**
 * GET /api/users/search
 * Search users by email or phone
 * Admin only
 */
router.get(
  '/search',
  authMiddleware,
  requireAdmin,
  query('email').optional().isEmail(),
  query('phone').optional().isMobilePhone(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  userController.searchUsers
);

module.exports = router;
