/**
 * Vehicle Routes
 * RESTful endpoints for vehicle management
 */

const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin, requireDriver } = require('../middleware/roleMiddleware');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

/**
 * POST /api/vehicles
 * Register new vehicle
 * Driver can register their own vehicles
 */
router.post(
  '/',
  authMiddleware,
  requireDriver,
  body('license_plate').isString().trim().notEmpty(),
  body('vehicle_type').isIn(['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck']),
  body('manufacturer').isString().trim().notEmpty(),
  body('model').isString().trim().notEmpty(),
  body('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('color').isString().trim().notEmpty(),
  body('registration_number').isString().trim().notEmpty(),
  vehicleController.registerVehicle
);

/**
 * GET /api/vehicles/:id
 * Get vehicle by ID
 */
router.get(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  vehicleController.getVehicle
);

/**
 * PUT /api/vehicles/:id
 * Update vehicle details
 */
router.put(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  body('vehicle_type').optional().isIn(['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck']),
  body('manufacturer').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('year').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('color').optional().isString().trim(),
  vehicleController.updateVehicle
);

/**
 * DELETE /api/vehicles/:id
 * Delete vehicle
 */
router.delete(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  vehicleController.deleteVehicle
);

/**
 * GET /api/vehicles/driver/:driverId
 * Get all vehicles for a driver
 */
router.get(
  '/driver/:driverId',
  authMiddleware,
  param('driverId').isInt().toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  vehicleController.getDriverVehicles
);

/**
 * GET /api/vehicles
 * Get all vehicles (admin only)
 */
router.get(
  '/',
  authMiddleware,
  requireAdmin,
  query('status').optional().isIn(['Pending', 'Verified', 'Rejected']),
  query('vehicle_type').optional().isIn(['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  vehicleController.getAllVehicles
);

/**
 * PUT /api/vehicles/:id/verify
 * Verify vehicle (admin only)
 */
router.put(
  '/:id/verify',
  authMiddleware,
  requireAdmin,
  param('id').isInt().toInt(),
  vehicleController.verifyVehicle
);

/**
 * PUT /api/vehicles/:id/reject
 * Reject vehicle (admin only)
 */
router.put(
  '/:id/reject',
  authMiddleware,
  requireAdmin,
  param('id').isInt().toInt(),
  body('reason').optional().isString(),
  vehicleController.rejectVehicle
);

module.exports = router;
