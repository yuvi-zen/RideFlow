/**
 * driverMatcher.js - Smart driver matching engine
 * Scores drivers by ETA, rating, verification, availability, and demand zone
 */

const { haversine } = require('./routePlanner');

// Scoring weights (should sum to ~1 for interpretability, but raw scores are fine)
const WEIGHTS = {
  proximity: 0.30,      // closer is better
  rating: 0.25,         // higher rating is better
  verification: 0.15,   // verified badge bonus
  availability: 0.15,   // online vs on_trip vs offline
  demandZone: 0.15      // driver in a high-demand zone gets slight boost
};

/**
 * Compute driver match score for a given pickup
 * @param {object} driver - driver record with current_location_lat, current_location_lng, average_rating, verification_status, availability_status
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {string} rideType - Economy | Premium | Bike
 * @returns {object} score breakdown + total score
 */
function scoreDriver(driver, pickupLat, pickupLng, rideType = 'Economy') {
  // Proximity score: inverse of ETA (assume 30 km/h avg urban)
  const distKm = haversine(
    driver.current_location_lat || driver.latitude || 0,
    driver.current_location_lng || driver.longitude || 0,
    pickupLat,
    pickupLng
  );
  const etaMin = (distKm / 30) * 60;
  // Score: 100 if 0 min, 0 if 30+ min
  const proximityScore = Math.max(0, 100 - (etaMin * 3.33));

  // Rating score: normalized to 0-100
  const ratingScore = ((driver.average_rating || 0) / 5) * 100;

  // Verification bonus
  const verificationScore = driver.verification_status === 'Verified' ? 100 : 50;

  // Availability score
  const availabilityMap = { Online: 100, 'On Trip': 40, Offline: 0 };
  const availabilityScore = availabilityMap[driver.availability_status] || 0;

  // Demand zone (placeholder: can be wired to actual zone data)
  const demandZoneScore = driver.in_demand_zone ? 100 : 60;

  // Vehicle type match (driver must support ride type; simplified check)
  const typeMatch = (driver.vehicle_type || '').toLowerCase() === rideType.toLowerCase() ? 100 : 70;

  const totalScore = Math.round(
    (proximityScore * WEIGHTS.proximity) +
    (ratingScore * WEIGHTS.rating) +
    (verificationScore * WEIGHTS.verification) +
    (availabilityScore * WEIGHTS.availability) +
    (demandZoneScore * WEIGHTS.demandZone)
  );

  return {
    driver_id: driver.id,
    distance_km: parseFloat(distKm.toFixed(2)),
    eta_min: Math.round(etaMin),
    proximity_score: Math.round(proximityScore),
    rating_score: Math.round(ratingScore),
    verification_score: verificationScore,
    availability_score: availabilityScore,
    demand_zone_score: demandZoneScore,
    type_match_score: typeMatch,
    total_score: totalScore
  };
}

/**
 * Rank and return top matching drivers
 * @param {Array} drivers - array of driver records
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {string} rideType
 * @param {number} limit - max results
 * @returns {Array} ranked drivers with scores
 */
function rankDrivers(drivers, pickupLat, pickupLng, rideType = 'Economy', limit = 5) {
  const scored = drivers
    .map(d => ({
      ...d,
      match: scoreDriver(d, pickupLat, pickupLng, rideType)
    }))
    .filter(d => d.match.availability_score > 0) // only available-ish
    .sort((a, b) => b.match.total_score - a.match.total_score);

  return scored.slice(0, limit);
}

module.exports = {
  scoreDriver,
  rankDrivers,
  WEIGHTS
};
