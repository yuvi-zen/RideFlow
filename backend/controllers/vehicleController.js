/**
 * Vehicle Controller
 * Handles vehicle registration, verification, and management
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse, paginatedResponse } = require('../utils/apiResponse');
const vehicleModel = require('../models/vehicleModel');
const driverModel = require('../models/driverModel');
const { USER_ROLES, VEHICLE_TYPE } = require('../config/constants');

/**
 * Register new vehicle
 * Driver can register vehicles
 */
async function registerVehicle(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const { license_plate, vehicle_type, manufacturer, model, year, color, registration_number } = req.body;

    // Check if user is a driver
    if (req.user.role !== USER_ROLES.DRIVER) {
      return errorResponse(res, 'Only drivers can register vehicles', 403);
    }

    // Get driver ID from user
    const driver = await driverModel.findByUserId(req.user.id);
    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    // Check if license plate already exists
    const exists = await vehicleModel.licensePlateExists(license_plate);
    if (exists) {
      return errorResponse(res, 'License plate already registered', 400);
    }

    // Create vehicle
    const vehicle = await vehicleModel.createVehicle({
      driver_id: driver.id,
      license_plate,
      vehicle_type,
      manufacturer,
      model,
      year,
      color,
      registration_number
    });

    return successResponse(res, vehicle, 'Vehicle registered successfully. Pending verification.', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get vehicle by ID
 */
async function getVehicle(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const vehicleId = req.params.id;
    const vehicle = await vehicleModel.findById(vehicleId);

    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    return successResponse(res, vehicle, 'Vehicle retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update vehicle details
 * Driver can update own vehicles, admin can update any
 */
async function updateVehicle(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const vehicleId = req.params.id;
    const { vehicle_type, manufacturer, model, year, color } = req.body;

    // Get vehicle
    const vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    // Check authorization
    if (req.user.role !== USER_ROLES.ADMIN) {
      const driver = await driverModel.findByUserId(req.user.id);
      if (!driver || vehicle.driver_id !== driver.id) {
        return errorResponse(res, 'Unauthorized to update this vehicle', 403);
      }
    }

    const updated = await vehicleModel.updateVehicle(vehicleId, {
      vehicle_type,
      manufacturer,
      model,
      year,
      color
    });

    return successResponse(res, updated, 'Vehicle updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete vehicle
 * Driver can delete own vehicles, admin can delete any
 */
async function deleteVehicle(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const vehicleId = req.params.id;

    const vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    // Check authorization
    if (req.user.role !== USER_ROLES.ADMIN) {
      const driver = await driverModel.findByUserId(req.user.id);
      if (!driver || vehicle.driver_id !== driver.id) {
        return errorResponse(res, 'Unauthorized to delete this vehicle', 403);
      }
    }

    const deleted = await vehicleModel.deleteVehicle(vehicleId);
    if (!deleted) {
      return errorResponse(res, 'Failed to delete vehicle', 500);
    }

    return successResponse(res, null, 'Vehicle deleted successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all vehicles by driver
 */
async function getDriverVehicles(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.driverId;
    const { limit = 10, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    // Verify driver exists
    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    const vehicles = await vehicleModel.findByDriver(driverId, limitNum, offsetNum);

    // Get count for pagination
    const [countResult] = await require('../config/db').getConnection().query(
      `SELECT COUNT(*) as count FROM vehicles WHERE driver_id = ?`,
      [driverId]
    );

    return paginatedResponse(res, vehicles, Math.floor(offsetNum / limitNum) + 1, limitNum, countResult[0].count, 'Vehicles retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get all vehicles for admin review
 * Admin only
 */
async function getAllVehicles(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const { status, vehicle_type, limit = 10, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const vehicles = await vehicleModel.getAll({
      status,
      vehicle_type,
      limit: limitNum,
      offset: offsetNum
    });

    const total = await vehicleModel.getCount({
      status,
      vehicle_type
    });

    return paginatedResponse(res, vehicles, Math.floor(offsetNum / limitNum) + 1, limitNum, total, 'Vehicles retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Verify vehicle
 * Admin only
 */
async function verifyVehicle(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const vehicleId = req.params.id;

    const vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    const updated = await vehicleModel.updateVerificationStatus(vehicleId, 'Verified');

    return successResponse(res, updated, 'Vehicle verified successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Reject vehicle
 * Admin only
 */
async function rejectVehicle(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const vehicleId = req.params.id;
    const { reason } = req.body;

    const vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) {
      return errorResponse(res, 'Vehicle not found', 404);
    }

    const updated = await vehicleModel.updateVerificationStatus(vehicleId, 'Rejected', reason);

    return successResponse(res, updated, `Vehicle rejected${reason ? ': ' + reason : ''}`, 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerVehicle,
  getVehicle,
  updateVehicle,
  deleteVehicle,
  getDriverVehicles,
  getAllVehicles,
  verifyVehicle,
  rejectVehicle
};
