/**
 * Ride Matching Service
 * Logic for matching riders with available drivers
 */

const driverModel = require('../models/driverModel');
const { RIDE_STATUS } = require('../config/constants');

/**
 * Find best available drivers for a ride
 */
exports.findMatchingDrivers = async (latitude, longitude, radiusKm = 5) => {
  try {
    // Get available drivers near the pickup location
    const drivers = await driverModel.findAvailableNearby(latitude, longitude, radiusKm);

    // Sort by rating and availability
    return drivers.sort((a, b) => {
      // Prefer higher-rated drivers
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }
      // Then prefer drivers with fewer trips in progress
      return a.total_trips - b.total_trips;
    });
  } catch (error) {
    throw new Error(`Driver matching failed: ${error.message}`);
  }
};

/**
 * Auto-assign best driver to a ride
 */
exports.autoAssignDriver = async (rideId, rideData, rideModel) => {
  try {
    const drivers = await exports.findMatchingDrivers(
      rideData.pickup_latitude,
      rideData.pickup_longitude
    );

    if (drivers.length === 0) {
      return {
        success: false,
        message: 'No available drivers found',
        drivers: []
      };
    }

    // Return top 3 drivers for rider to choose from
    // or auto-assign the best one
    return {
      success: true,
      message: 'Matching drivers found',
      drivers: drivers.slice(0, 3),
      recommended_driver: drivers[0]
    };
  } catch (error) {
    throw new Error(`Auto-assignment failed: ${error.message}`);
  }
};

/**
 * Estimate fare based on distance and ride type
 */
exports.estimateFare = (distance, rideType = 'Regular', surgePricing = 1.0) => {
  // Base fare logic
  const baseRate = 25; // Base rate in currency
  const perKmRate = 12; // Per kilometer rate
  
  // Ride type multipliers
  const typeMultipliers = {
    'Regular': 1.0,
    'Premium': 1.5,
    'Shared': 0.75
  };

  const multiplier = typeMultipliers[rideType] || 1.0;
  
  // Calculate fare: base + (distance * rate) * type_multiplier * surge_pricing
  const estimatedFare = Math.round(
    (baseRate + (distance * perKmRate)) * multiplier * surgePricing
  );

  return {
    base_fare: baseRate,
    distance_fare: distance * perKmRate,
    ride_type_multiplier: multiplier,
    surge_multiplier: surgePricing,
    estimated_fare: estimatedFare
  };
};

module.exports = exports;
