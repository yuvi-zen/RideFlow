/**
 * Ride Controller
 * Handles ride creation, assignment, tracking, completion
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse, paginatedResponse } = require('../utils/apiResponse');
const rideModel = require('../models/rideModel');
const rideMatchingService = require('../services/rideMatchingService');
const driverModel = require('../models/driverModel');
const db = require('../config/db');
const { USER_ROLES, RIDE_STATUS } = require('../config/constants');

/**
 * Request new ride
 */
async function requestRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const { pickup_location_id, dropoff_location_id, ride_type = 'Regular', scheduled_time } = req.body;

    // Fetch pickup coordinates for driver matching
    const [locations] = await db.pool.query('SELECT latitude, longitude FROM locations WHERE id = ?', [pickup_location_id]);
    const pickupCoords = locations[0] || { latitude: 33.6844, longitude: 73.0479 }; // Default to Islamabad center

    // Create ride request
    const ride = await rideModel.createRide({
      rider_id: req.user.id,
      pickup_location_id,
      dropoff_location_id,
      ride_type,
      scheduled_time
    });

    // Find matching drivers near pickup
    const matching = await rideMatchingService.findMatchingDrivers(
      parseFloat(pickupCoords.latitude), 
      parseFloat(pickupCoords.longitude)
    );

    return successResponse(
      res,
      { ...ride, available_drivers: matching.slice(0, 3) },
      'Ride requested. Searching for drivers...',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get ride details
 */
async function getRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;
    const ride = await rideModel.findById(rideId);

    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    // Check authorization
    if (req.user.role !== USER_ROLES.ADMIN && 
        req.user.id !== ride.rider_id &&
        (ride.driver_id && req.user.id !== ride.driver_id)) {
      return errorResponse(res, 'Unauthorized to view this ride', 403);
    }

    return successResponse(res, ride, 'Ride retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * List rides with filters
 */
async function listRides(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const { status, ride_type, limit = 10, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let filters = { limit: limitNum, offset: offsetNum };
    if (status) filters.status = status;
    if (ride_type) filters.ride_type = ride_type;

    // If not admin, restrict visibility
    if (req.user.role !== USER_ROLES.ADMIN) {
      if (req.user.role === USER_ROLES.RIDER) {
        // Riders only see rides they requested
        filters.rider_id = req.user.id;
      } else if (req.user.role === USER_ROLES.DRIVER) {
        // Get driver ID for this user
        const driver = await driverModel.findByUserId(req.user.id);
        if (!driver) {
          return errorResponse(res, 'Driver profile not found', 404);
        }
        
        // Drivers see 'Requested' rides (available) OR rides they are already assigned to
        if (status === RIDE_STATUS.REQUESTED) {
          // No rider/driver filter, show all available requests
        } else {
          // Only show rides assigned to this driver
          filters.driver_id = driver.id;
        }
      }
    }

    const rides = await rideModel.getRidesWithFilters(filters);
    const total = await rideModel.getRideCount(filters);

    return paginatedResponse(res, rides, Math.floor(offsetNum / limitNum) + 1, limitNum, total, 'Rides retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Driver accepts ride
 */
async function acceptRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;

    const ride = await rideModel.findById(rideId);
    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    if (ride.status !== 'Requested') {
      return errorResponse(res, 'Only requested rides can be accepted', 400);
    }

    // Get driver info
    const driver = await driverModel.findByUserId(req.user.id);
    if (!driver) {
      return errorResponse(res, 'Driver profile not found', 404);
    }

    // Assign driver and update status
    const updated = await rideModel.assignDriver(rideId, driver.id, ride.vehicle_id || driver.vehicle_id);
    const accepted = await rideModel.updateStatus(rideId, 'Accepted');

    return successResponse(res, accepted, 'Ride accepted successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Driver rejects ride
 */
async function rejectRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;

    const ride = await rideModel.findById(rideId);
    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    // Note: Rejection doesn't change ride status, driver just doesn't accept
    // Ride remains available for other drivers

    return successResponse(res, { ride_id: rideId, rejected: true }, 'Ride rejected', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Driver starts ride (pickup)
 */
async function startRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;

    const ride = await rideModel.findById(rideId);
    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    if (ride.status !== 'Accepted') {
      return errorResponse(res, 'Only accepted rides can be started', 400);
    }

    const updated = await rideModel.updateStatus(rideId, 'Started');

    return successResponse(res, updated, 'Ride started successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Driver completes ride (dropoff)
 */
async function completeRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;
    const { final_amount, actual_distance } = req.body;

    const ride = await rideModel.findById(rideId);
    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    if (ride.status !== 'Started') {
      return errorResponse(res, 'Only started rides can be completed', 400);
    }

    const updated = await rideModel.completRide(rideId, final_amount, actual_distance);

    return successResponse(res, updated, 'Ride completed successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel ride
 */
async function cancelRide(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;
    const { reason } = req.body;

    const ride = await rideModel.findById(rideId);
    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    // Only allow cancellation of non-completed, non-cancelled rides
    if (['Completed', 'Cancelled'].includes(ride.status)) {
      return errorResponse(res, 'Cannot cancel completed or already cancelled rides', 400);
    }

    const updated = await rideModel.cancelRide(rideId, reason);

    return successResponse(res, updated, 'Ride cancelled successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get rider's ride history
 */
async function getRiderHistory(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const userId = req.params.userId;
    const { limit = 20, offset = 0 } = req.query;

    // Check authorization
    if (req.user.role !== USER_ROLES.ADMIN && req.user.id !== parseInt(userId)) {
      return errorResponse(res, 'Unauthorized to view this user\'s history', 403);
    }

    const history = await rideModel.getRiderHistory(userId, parseInt(limit), parseInt(offset));

    return successResponse(res, history, 'Ride history retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get driver's completed rides
 */
async function getDriverHistory(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const driverId = req.params.driverId;
    const { limit = 20, offset = 0 } = req.query;

    const history = await rideModel.getDriverHistory(driverId, parseInt(limit), parseInt(offset));

    return successResponse(res, history, 'Driver history retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Get ride status timeline
 */
async function getRideTimeline(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;

    const timeline = await rideModel.getRideTimeline(rideId);
    if (!timeline) {
      return errorResponse(res, 'Ride not found', 404);
    }

    return successResponse(res, timeline, 'Ride timeline retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Update current ride location
 */
async function updateLocation(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }

    const rideId = req.params.id;
    const { latitude, longitude } = req.body;

    const ride = await rideModel.findById(rideId);
    if (!ride) {
      return errorResponse(res, 'Ride not found', 404);
    }

    if (ride.status !== 'Started') {
      return errorResponse(res, 'Can only update location for started rides', 400);
    }

    const updated = await rideModel.updateLocation(rideId, latitude, longitude);

    return successResponse(res, updated, 'Location updated successfully', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requestRide,
  getRide,
  listRides,
  acceptRide,
  rejectRide,
  startRide,
  completeRide,
  cancelRide,
  getRiderHistory,
  getDriverHistory,
  getRideTimeline,
  updateLocation
};
