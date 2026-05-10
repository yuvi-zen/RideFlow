/**
 * matchingEngine.js - Intelligent driver-rider matching system for RideFlow
 * Uses multi-factor scoring to find the best driver for each ride request.
 */

class MatchingEngine {
    constructor(routePlanner) {
        this.routePlanner = routePlanner;
        this.weights = {
            eta: 0.35,           // Driver ETA to pickup (most important)
            rating: 0.25,        // Driver rating
            distance: 0.20,      // Driver distance from pickup
            direction: 0.10,     // Direction of travel alignment
            demand: 0.05,        // Local demand balance
            verification: 0.05   // Verification status
        };
    }

    /**
     * Find the best driver for a ride request using intelligent scoring
     * @param {Object} rideRequest - Ride request with pickup, dropoff, preferences
     * @param {Array} availableDrivers - List of available drivers
     * @returns {Object} Best match with driver, score, and reasoning
     */
    findBestMatch(rideRequest, availableDrivers) {
        if (!availableDrivers || availableDrivers.length === 0) {
            return { match: null, score: 0, reasoning: 'No drivers available' };
        }

        const scoredDrivers = availableDrivers.map(driver => ({
            driver,
            score: this.calculateMatchScore(rideRequest, driver),
            factors: this.calculateScoreFactors(rideRequest, driver)
        }));

        // Sort by score (higher is better)
        scoredDrivers.sort((a, b) => b.score - a.score);

        const bestMatch = scoredDrivers[0];
        const reasoning = this.generateMatchReasoning(bestMatch);

        return {
            match: bestMatch.driver,
            score: bestMatch.score,
            factors: bestMatch.factors,
            reasoning,
            alternatives: scoredDrivers.slice(1, 4).map(s => ({
                driver: s.driver,
                score: s.score
            }))
        };
    }

    /**
     * Calculate comprehensive match score for driver-rider pair
     * @param {Object} rideRequest - Ride request details
     * @param {Object} driver - Driver details
     * @returns {number} Match score between 0-100
     */
    calculateMatchScore(rideRequest, driver) {
        const factors = this.calculateScoreFactors(rideRequest, driver);

        let totalScore = 0;
        for (const [factor, weight] of Object.entries(this.weights)) {
            totalScore += factors[factor] * weight;
        }

        return Math.round(totalScore * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Calculate individual scoring factors
     * @param {Object} rideRequest - Ride request details
     * @param {Object} driver - Driver details
     * @returns {Object} Factor scores (0-1 scale)
     */
    calculateScoreFactors(rideRequest, driver) {
        const pickup = rideRequest.pickup;
        const dropoff = rideRequest.dropoff;

        // ETA Score (lower ETA = higher score)
        const driverEta = this.routePlanner.estimateDriverEta(driver, pickup);
        const etaScore = Math.max(0, 1 - (driverEta.eta_min / 30)); // 30 min max for full score

        // Rating Score (higher rating = higher score)
        const ratingScore = driver.average_rating / 5.0;

        // Distance Score (closer = higher score)
        const distanceScore = Math.max(0, 1 - (driverEta.distance_km / 20)); // 20km max for full score

        // Direction Alignment Score
        const directionScore = this.calculateDirectionAlignment(driver, pickup, dropoff);

        // Demand Balance Score
        const demandScore = this.calculateDemandBalance(driver, pickup);

        // Verification Score
        const verificationScore = driver.verification_status === 'Verified' ? 1.0 :
                                 driver.verification_status === 'Pending' ? 0.5 : 0.0;

        return {
            eta: etaScore,
            rating: ratingScore,
            distance: distanceScore,
            direction: directionScore,
            demand: demandScore,
            verification: verificationScore
        };
    }

    /**
     * Calculate how well driver's direction aligns with the ride
     * @param {Object} driver - Driver details
     * @param {Object} pickup - Pickup location
     * @param {Object} dropoff - Dropoff location
     * @returns {number} Direction alignment score (0-1)
     */
    calculateDirectionAlignment(driver, pickup, dropoff) {
        if (!driver.current_heading || !driver.destination) {
            return 0.5; // Neutral score if no direction data
        }

        // Calculate bearing from driver's current location to destination
        const driverBearing = this.calculateBearing(
            driver.current_location.latitude,
            driver.current_location.longitude,
            driver.destination.latitude,
            driver.destination.longitude
        );

        // Calculate bearing from pickup to dropoff
        const rideBearing = this.calculateBearing(
            pickup.latitude,
            pickup.longitude,
            dropoff.latitude,
            dropoff.longitude
        );

        // Calculate bearing from driver to pickup
        const driverToPickupBearing = this.calculateBearing(
            driver.current_location.latitude,
            driver.current_location.longitude,
            pickup.latitude,
            pickup.longitude
        );

        // Check if driver is heading towards pickup area
        const bearingDiff = Math.abs(driverBearing - driverToPickupBearing);
        const normalizedDiff = Math.min(bearingDiff, 360 - bearingDiff) / 180; // 0-1 scale

        return 1 - normalizedDiff; // Higher score for better alignment
    }

    /**
     * Calculate bearing between two points (in degrees)
     * @param {number} lat1 - Start latitude
     * @param {number} lng1 - Start longitude
     * @param {number} lat2 - End latitude
     * @param {number} lng2 - End longitude
     * @returns {number} Bearing in degrees (0-360)
     */
    calculateBearing(lat1, lng1, lat2, lng2) {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;

        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    /**
     * Calculate demand balance score to distribute rides evenly
     * @param {Object} driver - Driver details
     * @param {Object} pickup - Pickup location
     * @returns {number} Demand balance score (0-1)
     */
    calculateDemandBalance(driver, pickup) {
        const zone = this.routePlanner.getZoneForLocation(pickup);
        if (!zone) return 0.5;

        // Lower score for high-demand zones (to balance load)
        // Higher score for low-demand zones (to encourage service)
        const demandLevel = zone.demand_level || 'Medium';
        const demandScores = { 'Low': 0.8, 'Medium': 0.5, 'High': 0.2 };

        return demandScores[demandLevel] || 0.5;
    }

    /**
     * Generate human-readable reasoning for the match
     * @param {Object} matchResult - Match result with driver and factors
     * @returns {string} Reasoning explanation
     */
    generateMatchReasoning(matchResult) {
        const { driver, factors } = matchResult;
        const reasons = [];

        if (factors.eta > 0.8) reasons.push('Very fast arrival time');
        else if (factors.eta > 0.6) reasons.push('Quick arrival time');
        else if (factors.eta > 0.4) reasons.push('Reasonable arrival time');

        if (factors.rating > 0.9) reasons.push('Excellent driver rating');
        else if (factors.rating > 0.8) reasons.push('Very good driver rating');

        if (factors.distance > 0.8) reasons.push('Very close to pickup location');
        else if (factors.distance > 0.6) reasons.push('Close to pickup location');

        if (factors.direction > 0.7) reasons.push('Heading in the right direction');
        if (factors.verification > 0.9) reasons.push('Fully verified driver');

        if (factors.demand < 0.4) reasons.push('Helping balance demand in busy area');

        return reasons.length > 0 ? reasons.join(', ') : 'Balanced match based on multiple factors';
    }

    /**
     * Get driver availability status with smart filtering
     * @param {Object} driver - Driver details
     * @param {Object} rideRequest - Ride request details
     * @returns {boolean} Whether driver is available for this request
     */
    isDriverAvailable(driver, rideRequest) {
        // Basic availability checks
        if (!driver.is_online || driver.status !== 'available') {
            return false;
        }

        // Check if driver is already assigned to a ride
        if (driver.current_ride_id) {
            return false;
        }

        // Check vehicle compatibility
        if (rideRequest.vehicle_type && driver.vehicle_type !== rideRequest.vehicle_type) {
            return false;
        }

        // Check location bounds (don't send drivers too far)
        const driverEta = this.routePlanner.estimateDriverEta(driver, rideRequest.pickup);
        if (driverEta.eta_min > 45) { // Max 45 minutes away
            return false;
        }

        return true;
    }

    /**
     * Auto-retry matching with different criteria if initial match fails
     * @param {Object} rideRequest - Ride request details
     * @param {Array} availableDrivers - List of available drivers
     * @param {number} attempt - Retry attempt number
     * @returns {Object} Match result or null
     */
    retryMatching(rideRequest, availableDrivers, attempt = 1) {
        if (attempt > 3) return null; // Max 3 attempts

        // Relax criteria on retries
        const relaxedWeights = { ...this.weights };

        if (attempt === 2) {
            // Second attempt: reduce ETA importance, increase distance tolerance
            relaxedWeights.eta = 0.25;
            relaxedWeights.distance = 0.30;
        } else if (attempt === 3) {
            // Third attempt: further relax criteria
            relaxedWeights.eta = 0.20;
            relaxedWeights.rating = 0.20;
            relaxedWeights.distance = 0.35;
            relaxedWeights.direction = 0.05;
        }

        // Temporarily update weights
        const originalWeights = { ...this.weights };
        this.weights = relaxedWeights;

        const result = this.findBestMatch(rideRequest, availableDrivers);

        // Restore original weights
        this.weights = originalWeights;

        return result.match ? result : null;
    }

    /**
     * Batch match multiple ride requests efficiently
     * @param {Array} rideRequests - Array of ride requests
     * @param {Array} availableDrivers - List of available drivers
     * @returns {Array} Array of match results
     */
    batchMatch(rideRequests, availableDrivers) {
        const results = [];
        const usedDrivers = new Set();

        for (const request of rideRequests) {
            const availableForRequest = availableDrivers.filter(driver =>
                !usedDrivers.has(driver.id) && this.isDriverAvailable(driver, request)
            );

            const match = this.findBestMatch(request, availableForRequest);

            if (match.match) {
                usedDrivers.add(match.match.id);
                results.push(match);
            } else {
                results.push({ match: null, score: 0, reasoning: 'No suitable driver found' });
            }
        }

        return results;
    }
}

const matchingEngine = new MatchingEngine();
window.matchingEngine = matchingEngine;
