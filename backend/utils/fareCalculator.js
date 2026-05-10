/**
 * fareCalculator.js - Advanced fare calculation engine
 * Computes fare estimates with base fare, distance, duration, ride type, surge, and traffic multipliers
 */

// Per-km rates by vehicle/ride type
const TYPE_RATES = {
  Economy: { base: 30, perKm: 12, perMin: 2, minFare: 50 },
  Premium: { base: 80, perKm: 22, perMin: 4, minFare: 150 },
  Bike: { base: 15, perKm: 8, perMin: 1.5, minFare: 25 }
};

// Surge pricing tiers by demand level
const SURGE_TIERS = {
  low: 1.0,
  normal: 1.0,
  high: 1.3,
  veryHigh: 1.8,
  extreme: 2.5
};

// Traffic condition multipliers (affects time component)
const TRAFFIC_MULTIPLIERS = {
  freeFlow: 1.0,
  light: 1.1,
  moderate: 1.3,
  heavy: 1.7,
  standstill: 2.2
};

/**
 * Calculate estimated fare
 * @param {number} distanceKm - route distance in km
 * @param {number} durationMin - estimated duration in minutes
 * @param {string} rideType - Economy | Premium | Bike
 * @param {object} options - { surgeLevel, trafficLevel, promoDiscountPct }
 * @returns {object} fare breakdown
 */
function calculateFare(distanceKm, durationMin, rideType = 'Economy', options = {}) {
  const rates = TYPE_RATES[rideType] || TYPE_RATES.Economy;
  const surge = SURGE_TIERS[options.surgeLevel] || 1.0;
  const traffic = TRAFFIC_MULTIPLIERS[options.trafficLevel] || 1.0;

  const distanceFare = distanceKm * rates.perKm;
  const timeFare = durationMin * rates.perMin * traffic;
  const subtotal = rates.base + distanceFare + timeFare;
  const surgeAmount = subtotal * (surge - 1);
  const totalBeforeDiscount = subtotal + surgeAmount;
  const promoDiscount = options.promoDiscountPct
    ? totalBeforeDiscount * (options.promoDiscountPct / 100)
    : 0;
  const estimatedFare = Math.max(rates.minFare, Math.round(totalBeforeDiscount - promoDiscount));

  return {
    base_fare: Math.round(rates.base),
    distance_fare: Math.round(distanceFare),
    time_fare: Math.round(timeFare),
    surge_multiplier: surge,
    surge_amount: Math.round(surgeAmount),
    traffic_multiplier: traffic,
    promo_discount: Math.round(promoDiscount),
    estimated_fare: estimatedFare,
    currency: 'PKR',
    ride_type: rideType
  };
}

/**
 * Estimate trip duration with traffic
 * @param {number} baseDurationMin - duration without traffic
 * @param {string} trafficLevel - traffic condition
 * @returns {number} estimated duration in minutes
 */
function estimateDuration(baseDurationMin, trafficLevel = 'normal') {
  const traffic = TRAFFIC_MULTIPLIERS[trafficLevel] || 1.0;
  return Math.round(baseDurationMin * traffic);
}

/**
 * Detect surge pricing based on supply-demand ratio
 * @param {number} availableDrivers - count of nearby available drivers
 * @param {number} activeRequests - count of active ride requests in zone
 * @returns {string} surge tier key
 */
function detectSurge(availableDrivers, activeRequests) {
  if (availableDrivers === 0) return activeRequests > 0 ? 'extreme' : 'normal';
  const ratio = activeRequests / availableDrivers;
  if (ratio < 0.5) return 'low';
  if (ratio < 1.0) return 'normal';
  if (ratio < 1.5) return 'high';
  if (ratio < 2.5) return 'veryHigh';
  return 'extreme';
}

module.exports = {
  calculateFare,
  estimateDuration,
  detectSurge,
  TYPE_RATES,
  SURGE_TIERS,
  TRAFFIC_MULTIPLIERS
};
