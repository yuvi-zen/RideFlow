/**
 * Driver Controller
 * Handles driver profile management, verification, availability
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse, paginatedResponse } = require('../utils/apiResponse');
const driverModel = require('../models/driverModel');
const { USER_ROLES } = require('../config/constants');

/**
 * Get driver profile by ID
 */
async function getProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;
    const driver = await driverModel.findById(driverId);

    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    return successResponse(res, driver, 'Driver profile retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver by user ID
 */
async function getByUserId(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const userId = req.params.userId;
    const driver = await driverModel.findByUserId(userId);

    if (!driver) {
      return errorResponse(res, 'Driver profile not found for this user', 404);
    }

    return successResponse(res, driver, 'Driver profile retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all drivers with filtering
 * Admin only
 */
async function getAllDrivers(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const { status, verified, limit = 10, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const drivers = await driverModel.getAll({
      status,
      verified: verified === 'true' ? true : verified === 'false' ? false : null,
      limit: limitNum,
      offset: offsetNum
    });

    const total = await driverModel.getCount({
      status,
      verified: verified === 'true' ? true : verified === 'false' ? false : null
    });

    return paginatedResponse(res, drivers, Math.floor(offsetNum / limitNum) + 1, limitNum, total, 'Drivers retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Update driver profile
 * Driver can update: license_number, license_expiry_date, vehicle_id
 */
async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;
    const { license_number, license_expiry_date, vehicle_id } = req.body;

    // Verify driver exists
    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Check if user can update this driver profile
    if (req.user.role !== USER_ROLES.ADMIN && req.user.id !== driver.user_id) {
      return errorResponse(res, 'Unauthorized to update this driver profile', 403);
    }

    const updated = await driverModel.updateProfile(driverId, {
      license_number,
      license_expiry_date,
      vehicle_id
    });

    return successResponse(res, updated, 'Driver profile updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update driver availability (Online/Offline/OnRide)
 */
async function updateAvailability(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;
    const { availability_status: status } = req.body;

    // Verify driver exists
    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // Check authorization (self or admin)
    if (req.user.role !== USER_ROLES.ADMIN && req.user.id !== driver.user_id) {
      return errorResponse(res, 'Unauthorized to update this driver\'s availability', 403);
    }

    const updated = await driverModel.updateAvailability(driverId, status);

    return successResponse(res, updated, `Driver availability set to ${status}`, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Verify driver (admin only)
 */
async function verifyDriver(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;

    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    const updated = await driverModel.updateVerificationStatus(driverId, 'Verified');

    return successResponse(res, updated, 'Driver verified successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Reject driver (admin only)
 */
async function rejectDriver(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;
    const { reason } = req.body;

    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    const updated = await driverModel.updateVerificationStatus(driverId, 'Rejected');

    return successResponse(res, updated, `Driver rejected${reason ? ': ' + reason : ''}`, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver statistics
 */
async function getStats(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;

    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    const stats = await driverModel.getStatistics(driverId);

    return successResponse(res, stats, 'Driver statistics retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver ratings history
 */
async function getRatings(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.id;

    const driver = await driverModel.findById(driverId);
    if (!driver) {
      return errorResponse(res, 'Driver not found', 404);
    }

    // This would normally query the ratings table
    // For now, return summary from driver record
    const ratingSummary = {
      driver_id: driverId,
      average_rating: driver.average_rating || 0,
      total_trips: driver.total_trips || 0
    };

    return successResponse(res, ratingSummary, 'Driver ratings retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Find available drivers near location
 */
async function findAvailable(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const { latitude, longitude, radius = 5 } = req.query;

    const drivers = await driverModel.findAvailableNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius)
    );

    return successResponse(res, drivers, `Found ${drivers.length} available drivers`, 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  getByUserId,
  getAllDrivers,
  updateProfile,
  updateAvailability,
  verifyDriver,
  rejectDriver,
  getStats,
  getRatings,
  findAvailable
};
