/**
 * Driver Routes
 * RESTful endpoints for driver management
 * NOTE: Specific routes MUST be declared before wildcard /:id routes
 */

const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin, requireDriver } = require('../middleware/roleMiddleware');
const driverController = require('../controllers/driverController');

const router = express.Router();

/**
 * GET /api/drivers
 * List all drivers (admin only)
 */
router.get(
  '/',
  authMiddleware,
  requireAdmin,
  query('status').optional().isIn(['Online', 'Offline', 'OnRide']),
  query('verified').optional().isIn(['true', 'false']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  driverController.getAllDrivers
);

/**
 * GET /api/drivers/available
 * Find available drivers near location
 * MUST be before /:id
 */
router.get(
  '/available',
  authMiddleware,
  query('latitude').isFloat({ min: -90, max: 90 }).toFloat(),
  query('longitude').isFloat({ min: -180, max: 180 }).toFloat(),
  query('radius').optional().isInt({ min: 1, max: 100 }).toInt(),
  driverController.findAvailable
);

/**
 * GET /api/drivers/user/:userId
 * Get driver by user ID
 * MUST be before /:id
 */
router.get(
  '/user/:userId',
  authMiddleware,
  param('userId').isInt().toInt(),
  driverController.getByUserId
);

/**
 * GET /api/drivers/:id
 * Get driver profile by ID
 */
router.get(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  driverController.getProfile
);

/**
 * PUT /api/drivers/:id/profile
 * Update driver profile (self or admin)
 */
router.put(
  '/:id/profile',
  authMiddleware,
  param('id').isInt().toInt(),
  body('license_number').optional().isString().trim(),
  body('license_expiry_date').optional().isISO8601(),
  body('vehicle_id').optional().isInt(),
  driverController.updateProfile
);

/**
 * PUT /api/drivers/:id/availability
 * Update driver availability status
 */
router.put(
  '/:id/availability',
  authMiddleware,
  param('id').isInt().toInt(),
  body('availability_status').isIn(['Online', 'Offline', 'On Trip']),
  driverController.updateAvailability
);

/**
 * PUT /api/drivers/:id/verify
 * Verify driver (admin only)
 */
router.put(
  '/:id/verify',
  authMiddleware,
  requireAdmin,
  param('id').isInt().toInt(),
  driverController.verifyDriver
);

/**
 * PUT /api/drivers/:id/reject
 * Reject driver (admin only)
 */
router.put(
  '/:id/reject',
  authMiddleware,
  requireAdmin,
  param('id').isInt().toInt(),
  body('reason').optional().isString(),
  driverController.rejectDriver
);

/**
 * GET /api/drivers/:id/stats
 * Get driver statistics (trips, earnings, ratings)
 */
router.get(
  '/:id/stats',
  authMiddleware,
  param('id').isInt().toInt(),
  driverController.getStats
);

/**
 * GET /api/drivers/:id/ratings
 * Get driver ratings summary
 */
router.get(
  '/:id/ratings',
  authMiddleware,
  param('id').isInt().toInt(),
  driverController.getRatings
);

module.exports = router;
