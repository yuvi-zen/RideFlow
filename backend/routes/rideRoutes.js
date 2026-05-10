/**
 * Ride Routes
 * RESTful endpoints for ride management
 */

const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const rideController = require('../controllers/rideController');

const router = express.Router();

/**
 * POST /api/rides
 * Request new ride
 */
router.post(
  '/',
  authMiddleware,
  body('pickup_location_id').isInt(),
  body('dropoff_location_id').isInt(),
  body('ride_type').optional().isIn(['Regular', 'Premium', 'Shared']),
  body('scheduled_time').optional().isISO8601(),
  rideController.requestRide
);

/**
 * GET /api/rides/:id
 * Get ride details
 */
router.get(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  rideController.getRide
);

/**
 * GET /api/rides
 * List rides with filters
 */
router.get(
  '/',
  authMiddleware,
  query('status').optional().isIn(['Requested', 'Accepted', 'Started', 'Completed', 'Cancelled']),
  query('ride_type').optional().isIn(['Regular', 'Premium', 'Shared']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  rideController.listRides
);

/**
 * PUT /api/rides/:id/accept
 * Driver accepts ride
 */
router.put(
  '/:id/accept',
  authMiddleware,
  param('id').isInt().toInt(),
  rideController.acceptRide
);

/**
 * PUT /api/rides/:id/reject
 * Driver rejects ride
 */
router.put(
  '/:id/reject',
  authMiddleware,
  param('id').isInt().toInt(),
  rideController.rejectRide
);

/**
 * PUT /api/rides/:id/start
 * Driver starts ride (picks up passenger)
 */
router.put(
  '/:id/start',
  authMiddleware,
  param('id').isInt().toInt(),
  rideController.startRide
);

/**
 * PUT /api/rides/:id/complete
 * Driver completes ride (drops off passenger)
 */
router.put(
  '/:id/complete',
  authMiddleware,
  param('id').isInt().toInt(),
  body('final_amount').isFloat({ min: 0 }),
  body('actual_distance').isFloat({ min: 0 }),
  rideController.completeRide
);

/**
 * PUT /api/rides/:id/cancel
 * Cancel ride
 */
router.put(
  '/:id/cancel',
  authMiddleware,
  param('id').isInt().toInt(),
  body('reason').optional().isString(),
  rideController.cancelRide
);

/**
 * GET /api/rides/user/:userId
 * Get rider's ride history
 */
router.get(
  '/user/:userId',
  authMiddleware,
  param('userId').isInt().toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  rideController.getRiderHistory
);

/**
 * GET /api/rides/driver/:driverId
 * Get driver's completed rides
 */
router.get(
  '/driver/:driverId',
  authMiddleware,
  param('driverId').isInt().toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  rideController.getDriverHistory
);

/**
 * GET /api/rides/:id/timeline
 * Get ride status timeline
 */
router.get(
  '/:id/timeline',
  authMiddleware,
  param('id').isInt().toInt(),
  rideController.getRideTimeline
);

/**
 * PUT /api/rides/:id/location
 * Update current ride location
 */
router.put(
  '/:id/location',
  authMiddleware,
  param('id').isInt().toInt(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  rideController.updateLocation
);

module.exports = router;
