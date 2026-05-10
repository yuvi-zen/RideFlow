/**
 * routePlanner.js - Smart route optimization utilities for RideFlow
 * Uses a lightweight route graph, route steps, and matching logic.
 */

class RoutePlanner {
    constructor() {
        this.trafficFactor = 1.0;
        this.baseSpeedKmPerMinute = 0.33;
    }

    createNode(id, label, latitude, longitude, type = 'checkpoint', metadata = {}) {
        return { id, label, latitude, longitude, type, metadata };
    }

    createEdge(id, from, to, distance_km, duration_min, status = 'Clear', road_type = 'Urban') {
        return { id, from, to, distance_km, duration_min, status, road_type };
    }

    /**
     * Dijkstra's algorithm for shortest path in weighted graph
     * @param {Object} graph - Graph with nodes, edges, adjacency
     * @param {string} startNodeId - Starting node ID
     * @param {string} endNodeId - Ending node ID
     * @param {number} trafficFactor - Traffic multiplier for edge weights
     * @returns {Object} Shortest path result with path, distance, duration
     */
    findShortestPath(graph, startNodeId, endNodeId, trafficFactor = 1.0) {
        const distances = {};
        const previous = {};
        const unvisited = new Set();

        // Initialize distances
        graph.nodes.forEach(node => {
            distances[node.id] = node.id === startNodeId ? 0 : Infinity;
            unvisited.add(node.id);
        });

        while (unvisited.size > 0) {
            // Find node with minimum distance
            let currentNodeId = null;
            let minDistance = Infinity;

            for (const nodeId of unvisited) {
                if (distances[nodeId] < minDistance) {
                    minDistance = distances[nodeId];
                    currentNodeId = nodeId;
                }
            }

            if (currentNodeId === null || distances[currentNodeId] === Infinity) break;
            unvisited.delete(currentNodeId);

            // Update neighbors
            const neighbors = graph.adjacency[currentNodeId] || [];
            for (const edge of neighbors) {
                const neighborId = edge.to;
                if (!unvisited.has(neighborId)) continue;

                const edgeWeight = edge.distance_km * trafficFactor; // Weight by distance and traffic
                const alt = distances[currentNodeId] + edgeWeight;

                if (alt < distances[neighborId]) {
                    distances[neighborId] = alt;
                    previous[neighborId] = currentNodeId;
                }
            }
        }

        // Reconstruct path
        const path = [];
        let current = endNodeId;

        while (current !== undefined && current !== startNodeId) {
            path.unshift(current);
            current = previous[current];
        }

        if (current === startNodeId) {
            path.unshift(startNodeId);
        }

        // Calculate total distance and duration
        let totalDistance = 0;
        let totalDuration = 0;

        for (let i = 0; i < path.length - 1; i++) {
            const fromId = path[i];
            const toId = path[i + 1];
            const edge = graph.edges.find(e => e.from === fromId && e.to === toId);

            if (edge) {
                totalDistance += edge.distance_km;
                totalDuration += Math.max(3, Math.round(edge.duration_min * trafficFactor));
            }
        }

        return {
            path: path.map(nodeId => graph.nodes.find(n => n.id === nodeId)),
            totalDistance: Number(totalDistance.toFixed(2)),
            totalDuration,
            found: path.length > 0 && path[0].id === startNodeId
        };
    }

    /**
     * Build optimal route using shortest path algorithm
     * @param {Object} pickup - Pickup location
     * @param {Object} dropoff - Dropoff location
     * @param {Object} options - Route options
     * @returns {Object} Complete route with steps, checkpoints, stages
     */
    buildOptimalRoute(pickup, dropoff, options = {}) {
        const trafficFactor = options.trafficFactor || this.computeTrafficFactor(this.getTrafficLevel(pickup, dropoff));
        const graph = this.createRouteGraph(pickup, dropoff, options);

        // Find shortest path from pickup to dropoff
        const routeResult = this.findShortestPath(graph, pickup.id, dropoff.id, trafficFactor);

        if (!routeResult.found) {
            // Fallback to direct route if shortest path fails
            return this.buildRoute(pickup, dropoff, options);
        }

        // Build route steps from path
        const steps = this.buildRouteStepsFromPath(graph, routeResult.path, trafficFactor);
        const checkpoints = this.createCheckpointsFromPath(graph, routeResult.path, trafficFactor);
        const stages = this.createStages();

        return {
            id: `route-${Date.now()}`,
            pickup,
            dropoff,
            steps,
            checkpoints,
            stages,
            total_distance: routeResult.totalDistance,
            total_duration: routeResult.totalDuration,
            estimated_fare: this.estimateFare(routeResult.totalDistance, routeResult.totalDuration, trafficFactor),
            traffic_level: this.getTrafficLevel(pickup, dropoff),
            traffic_factor: trafficFactor,
            created_at: new Date().toISOString(),
            algorithm: 'dijkstra_shortest_path'
        };
    }

    /**
     * Create a comprehensive route graph with multiple paths
     */
    createRouteGraph(pickup, dropoff, options = {}) {
        const nodes = [];
        const edges = [];
        const adjacency = {};

        // Add pickup and dropoff nodes
        nodes.push(this.createNode(pickup.id, pickup.address, pickup.latitude, pickup.longitude, 'pickup'));
        nodes.push(this.createNode(dropoff.id, dropoff.address, dropoff.latitude, dropoff.longitude, 'dropoff'));

        // Add intermediate checkpoints for realistic routing
        const checkpoints = this.generateIntermediateNodes(pickup, dropoff, options);
        checkpoints.forEach(cp => nodes.push(cp));

        // Initialize adjacency
        nodes.forEach(node => {
            adjacency[node.id] = [];
        });

        // Create edges between all nodes with realistic weights
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const from = nodes[i];
                const to = nodes[j];
                const distance = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
                const baseDuration = Math.max(3, Math.round(distance * 3.2 + 2));

                // Add some randomness and road type considerations
                const roadMultiplier = Math.random() * 0.3 + 0.85; // 0.85-1.15
                const duration = Math.round(baseDuration * roadMultiplier);

                const edge = this.createEdge(
                    `${from.id}-${to.id}`,
                    from.id,
                    to.id,
                    distance,
                    duration,
                    'Clear',
                    Math.random() > 0.7 ? 'Highway' : 'Urban'
                );

                edges.push(edge);
                adjacency[from.id].push(edge);

                // Bidirectional
                const reverseEdge = this.createEdge(
                    `${to.id}-${from.id}`,
                    to.id,
                    from.id,
                    distance,
                    duration,
                    'Clear',
                    edge.road_type
                );
                edges.push(reverseEdge);
                adjacency[to.id].push(reverseEdge);
            }
        }

        return { nodes, edges, adjacency };
    }

    /**
     * Generate intermediate nodes for more realistic routing
     */
    generateIntermediateNodes(pickup, dropoff, options = {}) {
        const checkpoints = [];
        const numCheckpoints = options.checkpoints || 3;

        for (let i = 1; i <= numCheckpoints; i++) {
            const ratio = i / (numCheckpoints + 1);
            const lat = pickup.latitude + (dropoff.latitude - pickup.latitude) * ratio;
            const lng = pickup.longitude + (dropoff.longitude - pickup.longitude) * ratio;

            // Add some variation
            const variation = 0.01; // ~1km
            const variedLat = lat + (Math.random() - 0.5) * variation;
            const variedLng = lng + (Math.random() - 0.5) * variation;

            checkpoints.push(this.createNode(
                `cp-${i}`,
                `Checkpoint ${i}`,
                variedLat,
                variedLng,
                'checkpoint',
                { sequence: i }
            ));
        }

        return checkpoints;
    }

    /**
     * Build route steps from shortest path
     */
    buildRouteStepsFromPath(graph, path, trafficFactor) {
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;

        return path.map((node, index) => {
            let distance_from_prev = 0;
            let duration_from_prev = 0;

            if (index > 0) {
                const prevNode = path[index - 1];
                const edge = graph.edges.find(e => e.from === prevNode.id && e.to === node.id);
                if (edge) {
                    distance_from_prev = edge.distance_km;
                    duration_from_prev = Math.max(3, Math.round(edge.duration_min * trafficFactor));
                }
            }

            cumulativeDistance += distance_from_prev;
            cumulativeDuration += duration_from_prev;

            return {
                id: `step-${index + 1}`,
                sequence: index + 1,
                node_id: node.id,
                label: node.label,
                type: node.type,
                status: index === 0 ? 'Pending' : 'Upcoming',
                distance_from_prev: Number(distance_from_prev.toFixed(2)),
                duration_from_prev,
                cumulative_distance: Number(cumulativeDistance.toFixed(2)),
                cumulative_duration: cumulativeDuration,
                planned_eta: new Date(Date.now() + cumulativeDuration * 60000).toISOString(),
                arrived_at: null
            };
        });
    }

    /**
     * Create checkpoints from path
     */
    createCheckpointsFromPath(graph, path, trafficFactor) {
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;

        return path.map((node, index) => {
            let distance_from_prev = 0;
            let duration_from_prev = 0;

            if (index > 0) {
                const prevNode = path[index - 1];
                const edge = graph.edges.find(e => e.from === prevNode.id && e.to === node.id);
                if (edge) {
                    distance_from_prev = edge.distance_km;
                    duration_from_prev = Math.max(3, Math.round(edge.duration_min * trafficFactor));
                }
            }

            cumulativeDistance += distance_from_prev;
            cumulativeDuration += duration_from_prev;

            return {
                id: node.id,
                label: node.label,
                type: node.type,
                sequence: index + 1,
                status: index === 0 ? 'pending' : 'upcoming',
                distance_from_prev: Number(distance_from_prev.toFixed(2)),
                duration_from_prev,
                cumulative_distance: Number(cumulativeDistance.toFixed(2)),
                cumulative_duration: cumulativeDuration,
                planned_eta: new Date(Date.now() + cumulativeDuration * 60000).toISOString(),
                arrived_at: null,
                metadata: node.metadata || {}
            };
        });
    }


    buildRouteSteps(graph, trafficFactor = 1.0) {
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;

        return graph.nodes.map((node, index) => {
            const incomingEdge = graph.edges[index - 1];
            const distance_from_prev = incomingEdge ? incomingEdge.distance_km : 0;
            const duration_from_prev = incomingEdge ? Math.max(3, Math.round(incomingEdge.duration_min * trafficFactor)) : 0;
            cumulativeDistance += distance_from_prev;
            cumulativeDuration += duration_from_prev;

            return {
                id: `step-${index + 1}`,
                sequence: index + 1,
                node_id: node.id,
                label: node.label,
                type: node.type,
                status: index === 0 ? 'Pending' : 'Upcoming',
                distance_from_prev: Number(distance_from_prev.toFixed(2)),
                duration_from_prev,
                cumulative_distance: Number(cumulativeDistance.toFixed(2)),
                cumulative_duration: cumulativeDuration,
                planned_eta: new Date(Date.now() + cumulativeDuration * 60000).toISOString(),
                arrived_at: null
            };
        });
    }

    createStages() {
        return [
            { code: 'requested', label: 'Requested', status: 'active', description: 'Waiting for driver match and confirmation' },
            { code: 'driver_en_route', label: 'Driver en route', status: 'pending', description: 'Driver is on the way to pickup' },
            { code: 'waiting', label: 'Waiting', status: 'pending', description: 'Driver has arrived and is waiting for passenger' },
            { code: 'in_progress', label: 'In progress', status: 'pending', description: 'Trip is underway' },
            { code: 'completed', label: 'Completed', status: 'pending', description: 'Trip has completed' },
            { code: 'cancelled', label: 'Cancelled', status: 'pending', description: 'Trip was cancelled' }
        ];
    }

    createCheckpoints(graph, trafficFactor = 1.0) {
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;

        return graph.nodes.map((node, index) => {
            const incomingEdge = graph.edges[index - 1];
            const distance_from_prev = incomingEdge ? incomingEdge.distance_km : 0;
            const duration_from_prev = incomingEdge ? Math.max(3, Math.round(incomingEdge.duration_min * trafficFactor)) : 0;
            cumulativeDistance += distance_from_prev;
            cumulativeDuration += duration_from_prev;

            return {
                id: node.id,
                label: node.label,
                type: node.type,
                sequence: index + 1,
                status: index === 0 ? 'pending' : 'upcoming',
                distance_from_prev: Number(distance_from_prev.toFixed(2)),
                duration_from_prev,
                cumulative_distance: Number(cumulativeDistance.toFixed(2)),
                cumulative_duration: cumulativeDuration,
                planned_eta: new Date(Date.now() + cumulativeDuration * 60000).toISOString(),
                arrived_at: null,
                metadata: node.metadata || {}
            };
        });
    }

    normalizeLocation(locationInput) {
        if (!locationInput) return null;
        if (typeof locationInput === 'object' && locationInput.latitude && locationInput.longitude) {
            return locationInput;
        }

        if (typeof locationInput === 'number') {
            return mockLocations.find(loc => loc.id === locationInput) || null;
        }

        if (typeof locationInput === 'string') {
            const lowerQuery = locationInput.toLowerCase();
            return mockLocations.find(loc => loc.address.toLowerCase().includes(lowerQuery) || loc.city.toLowerCase().includes(lowerQuery)) || null;
        }

        return null;
    }

    getZoneForLocation(location) {
        if (!location) return null;
        const normalizedAddress = String(location.address || location.label || '').toLowerCase();
        return (mockDemandZones || []).find(zone =>
            normalizedAddress.includes(zone.label.toLowerCase()) ||
            String(location.city || '').toLowerCase() === zone.label.toLowerCase()
        ) || null;
    }

    getTrafficLevel(pickup, dropoff) {
        const pickupZone = this.getZoneForLocation(pickup);
        const dropoffZone = this.getZoneForLocation(dropoff);
        const scores = [pickupZone?.score || 60, dropoffZone?.score || 60];
        const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
        const randomOffset = Math.round((Math.random() - 0.5) * 12);
        const trafficScore = Math.min(100, Math.max(50, average + randomOffset));

        if (trafficScore >= 90) return 'Severe';
        if (trafficScore >= 80) return 'Heavy';
        if (trafficScore >= 70) return 'Busy';
        return 'Normal';
    }

    computeTrafficFactor(trafficLevel = 'Normal') {
        const factors = {
            Normal: 1.0,
            Busy: 1.15,
            Heavy: 1.35,
            Severe: 1.55
        };
        return factors[trafficLevel] || 1.0;
    }

    computeRouteSurge(route) {
        if (!route) return 1.0;
        const trafficValue = route.traffic_level || 'Normal';
        const levelSurge = {
            Normal: 1.0,
            Busy: 1.1,
            Heavy: 1.25,
            Severe: 1.45
        }[trafficValue] || 1.0;
        const pickupZone = this.getZoneForLocation(route.pickup);
        const demandBoost = pickupZone && pickupZone.demand_level === 'High' ? 0.1 : 0;
        return Number(Math.max(levelSurge, 1.0 + demandBoost).toFixed(2));
    }

    estimateFare(route, vehicleType = 'Economy', promo = null) {
        const baseRule = (mockFareRules || []).find(rule => rule.vehicle_type === vehicleType) || (mockFareRules || [])[0] || {
            base_rate: 50,
            per_km_rate: 18,
            per_minute_rate: 5,
            surge_multiplier: 1.0
        };
        const surgeMultiplier = Math.max(baseRule.surge_multiplier || 1, this.computeRouteSurge(route));
        const travelCost = baseRule.base_rate + route.distance_km * baseRule.per_km_rate + route.duration_min * baseRule.per_minute_rate;
        const rawFare = travelCost * surgeMultiplier;
        const discount = promo && promo.discount_percent ? Math.round(rawFare * (promo.discount_percent / 100)) : 0;
        const total = Math.max(0, rawFare - discount);

        return {
            vehicle_type: vehicleType,
            base_rate: baseRule.base_rate,
            per_km_rate: baseRule.per_km_rate,
            per_minute_rate: baseRule.per_minute_rate,
            surge_multiplier: Number(surgeMultiplier.toFixed(2)),
            traffic_level: route.traffic_level,
            traffic_factor: route.traffic_factor,
            estimated_distance: Number(route.distance_km.toFixed(2)),
            estimated_duration: route.duration_min,
            discount_amount: discount,
            promo_code: promo?.code || null,
            estimated_total: Number(total.toFixed(2))
        };
    }

    updateRouteForTraffic(route, options = {}) {
        if (!route) return null;
        const trafficLevel = options.trafficLevel || route.traffic_level || this.getTrafficLevel(route.pickup, route.dropoff);
        const trafficFactor = this.computeTrafficFactor(trafficLevel);
        const updatedSteps = this.buildRouteSteps(route.graph, trafficFactor);
        const updatedCheckpoints = this.createCheckpoints(route.graph, trafficFactor);
        const updatedDuration = updatedSteps.reduce((sum, step) => sum + step.duration_from_prev, 0);
        const updatedDistance = route.graph.edges.reduce((sum, edge) => sum + edge.distance_km, 0);
        const updatedEta = new Date(Date.now() + updatedDuration * 60000).toISOString();

        const updatedRoute = {
            ...route,
            traffic_level: trafficLevel,
            traffic_factor: trafficFactor,
            surge_multiplier: this.computeRouteSurge(route),
            duration_min: updatedDuration,
            distance_km: Number(updatedDistance.toFixed(2)),
            eta: updatedEta,
            steps: updatedSteps,
            checkpoints: updatedCheckpoints,
            last_updated: new Date().toISOString(),
            traffic_alert: trafficLevel !== 'Normal' ? `Traffic: ${trafficLevel}` : null,
            fare_estimate: this.estimateFare({ ...route, duration_min: updatedDuration, distance_km: updatedDistance, traffic_level: trafficLevel, traffic_factor: trafficFactor }, route.vehicle_type || 'Economy', route.promo)
        };

        if (updatedRoute.driver) {
            updatedRoute.driver = { ...updatedRoute.driver, current_location: this.interpolateDriverPosition(updatedRoute, updatedRoute.progress_pct || 0) };
        }

        return updatedRoute;
    }

    recomputeRoute(route, options = {}) {
        if (!route) return null;
        const rebuilt = this.buildRoute(route.pickup, route.dropoff, route.waypoints || [], route.driver, options);
        rebuilt.id = route.id || rebuilt.id;
        rebuilt.progress_pct = route.progress_pct || 0;
        rebuilt.active_stage = route.active_stage || rebuilt.active_stage;
        rebuilt.status = route.status || rebuilt.status;
        rebuilt.last_updated = new Date().toISOString();
        rebuilt.fare_estimate = this.estimateFare(rebuilt, route.vehicle_type || 'Economy', route.promo);
        return rebuilt;
    }

    simulateLiveProgress(route, elapsedMinutes = 0) {
        if (!route) return null;
        const updated = this.advanceRouteProgress(route, elapsedMinutes);
        return {
            ...updated,
            live_status: updated.progress_pct < 100 ? 'Driver is approaching pickup' : 'Trip completed',
            estimated_arrival: updated.eta
        };
    }

    buildDemandZones() {
        if (mockDemandZones && mockDemandZones.length) {
            return mockDemandZones;
        }
        return [
            { id: 999, label: 'Central', demand_level: 'Moderate', score: 72, trend: 'Stable', center: { latitude: 33.6900, longitude: 73.0500 } }
        ];
    }

    computeEta(distance_km, trafficFactor = 1.0) {
        const rawMinutes = Math.round(distance_km / this.baseSpeedKmPerMinute);
        return Math.max(3, Math.round(rawMinutes * trafficFactor));
    }

    estimateDriverEta(driver, pickup) {
        if (!driver || !driver.current_location) {
            return { distance_km: 0, eta_min: 0 };
        }

        const distance = Number(calculateDistance(driver.current_location.latitude, driver.current_location.longitude, pickup.latitude, pickup.longitude));
        const ratingFactor = driver.average_rating < 4.0 ? 1.1 : 1.0;
        const eta = this.computeEta(distance, ratingFactor);

        return { distance_km: Number(distance.toFixed(2)), eta_min: eta };
    }

    buildRoute(pickup, dropoff, waypoints = [], driver = null, options = {}) {
        if (typeof options !== 'object' || options === null) {
            options = {};
        }

        // Use optimal routing with shortest path algorithm
        return this.buildOptimalRoute(pickup, dropoff, { ...options, waypoints, driver });
    }

    buildRouteFromRide(ride) {
        const pickupLocation = this.normalizeLocation(ride.pickup_location_id || ride.pickup_location) || { address: ride.pickup_location || 'Pickup', latitude: 33.6844, longitude: 73.0479 };
        const dropoffLocation = this.normalizeLocation(ride.dropoff_location_id || ride.dropoff_location) || { address: ride.dropoff_location || 'Drop-off', latitude: 33.7190, longitude: 73.1719 };
        const driver = ride.driver_id ? mockDrivers.find(d => d.id === ride.driver_id) : null;

        return this.buildRoute(
            { label: pickupLocation.address, latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
            { label: dropoffLocation.address, latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
            [],
            driver
        );
    }

    advanceRouteProgress(route, completedMinutes = 0) {
        const progress = Math.min(100, Math.round((completedMinutes / Math.max(1, route.duration_min)) * 100));
        const remaining = Math.max(0, route.duration_min - completedMinutes);
        const eta = new Date(Date.now() + remaining * 60000).toISOString();
        const coveredDistance = (route.distance_km * progress) / 100;

        let distanceAcc = 0;
        const updatedSteps = route.steps.map(step => {
            const isPassed = step.cumulative_distance <= coveredDistance;
            const newStatus = isPassed ? 'Completed' : step.sequence === 1 || distanceAcc < coveredDistance ? 'In Progress' : 'Upcoming';
            distanceAcc = step.cumulative_distance;
            return {
                ...step,
                status: newStatus,
                arrived_at: isPassed ? step.planned_eta : null
            };
        });

        const stageIndex = progress === 100 ? 4 : progress > 5 ? 3 : progress > 1 ? 1 : 0;
        const updatedStages = route.stages ? route.stages.map((stage, index) => ({
            ...stage,
            status: index < stageIndex ? 'completed' : index === stageIndex ? 'active' : 'pending'
        })) : route.stages;

        const updated = {
            ...route,
            progress_pct: progress,
            eta,
            remaining_min: remaining,
            last_updated: new Date().toISOString(),
            steps: updatedSteps,
            stages: updatedStages,
            active_stage: updatedStages?.find(stage => stage.status === 'active')?.code || route.active_stage,
            driver_location: this.interpolateDriverPosition(route, progress)
        };

        if (updated.driver) {
            updated.driver = { ...updated.driver, current_location: updated.driver_location };
        }

        return updated;
    }

    interpolateDriverPosition(route, progressPercent) {
        const origin = route.pickup;
        const destination = route.dropoff;
        const latitude = origin.latitude + (destination.latitude - origin.latitude) * (progressPercent / 100);
        const longitude = origin.longitude + (destination.longitude - origin.longitude) * (progressPercent / 100);
        return { latitude, longitude, address: 'Live driver position' };
    }

    findBestDriver(rideRequest, options = {}) {
        const pickupLocation = this.normalizeLocation(rideRequest.pickup_location || rideRequest.pickup_location_id);
        const dropoffLocation = this.normalizeLocation(rideRequest.dropoff_location || rideRequest.dropoff_location_id);
        if (!pickupLocation || !dropoffLocation) {
            return null;
        }

        const availableDrivers = mockDrivers.filter(driver => driver.availability_status === 'Online');
        const candidates = availableDrivers.map(driver => {
            const vehicle = mockVehicles.find(v => v.driver_id === driver.id);
            const distance = Number(calculateDistance(driver.current_location.latitude, driver.current_location.longitude, pickupLocation.latitude, pickupLocation.longitude));
            const availabilityScore = driver.availability_status === 'Online' ? 30 : 0;
            const verificationScore = (driver.verification_status === 'Verified' ? 20 : 0) + (vehicle?.verification_status === 'Verified' ? 20 : 0);
            const ratingScore = Math.round(driver.average_rating * 10);
            const distanceScore = Math.max(0, 30 - distance * 4);
            const cityScore = driver.current_location.address?.toLowerCase().includes(pickupLocation.city.toLowerCase()) ? 10 : 0;
            const totalScore = availabilityScore + verificationScore + ratingScore + distanceScore + cityScore;

            return {
                driver,
                vehicle,
                score: totalScore,
                distance_to_pickup_km: Number(distance.toFixed(2)),
                pickup_eta_min: Math.max(3, Math.round(distance * 3.2)),
                reason: this.buildMatchReason(driver, vehicle, distance, pickupLocation)
            };
        });

        candidates.sort((a, b) => b.score - a.score || a.distance_to_pickup_km - b.distance_to_pickup_km);
        return candidates[0] || null;
    }

    buildMatchReason(driver, vehicle, distance, pickupLocation) {
        const reasons = [];
        if (driver.verification_status === 'Verified') reasons.push('Verified driver');
        if (vehicle?.verification_status === 'Verified') reasons.push('Verified vehicle');
        if (distance <= 4) reasons.push('Nearest available driver');
        if (driver.average_rating >= 4.5) reasons.push('Highly rated');
        if (pickupLocation && driver.current_location.address?.toLowerCase().includes(pickupLocation.city.toLowerCase())) reasons.push('Local driver nearby');
        return reasons.length ? reasons.join(', ') : 'Best available match';
    }

    suggestDriverForRequest(rideRequest) {
        const match = this.findBestDriver(rideRequest);
        if (!match) return null;

        const pickupLocation = this.normalizeLocation(rideRequest.pickup_location || rideRequest.pickup_location_id);
        const dropoffLocation = this.normalizeLocation(rideRequest.dropoff_location || rideRequest.dropoff_location_id);

        const route = this.buildRoute(
            { label: pickupLocation.address, latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
            { label: dropoffLocation.address, latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
            [],
            match.driver
        );

        route.match = {
            reason: match.reason,
            score: match.score,
            assigned_at: new Date().toISOString(),
            distance_to_pickup_km: match.distance_to_pickup_km,
            pickup_eta_min: match.pickup_eta_min
        };

        return route;
    }

    optimizeRoute(route, trafficUpdate = {}) {
        const trafficFactor = Number(trafficUpdate.factor || 1.0);
        const delay = Number(trafficUpdate.delay || 0);
        const alternateRoute = trafficUpdate.alternate ? this.buildAlternateRoute(route) : null;

        const updatedDuration = Math.max(3, Math.round(route.duration_min * trafficFactor + delay));
        const updatedDistance = Number((route.distance_km * (alternateRoute ? 1.02 : 1)).toFixed(2));
        const updatedRoute = {
            ...route,
            traffic_alert: trafficFactor > 1 ? `Traffic detected: ${Math.round((trafficFactor - 1) * 100)}% slower` : null,
            suggested_alternative: alternateRoute ? alternateRoute : null,
            duration_min: updatedDuration,
            distance_km: updatedDistance,
            eta: new Date(Date.now() + updatedDuration * 60000).toISOString(),
            notes: alternateRoute ? 'A faster alternate route is available.' : route.notes,
            traffic_factor: trafficFactor,
            traffic_level: route.traffic_level || 'Busy'
        };

        updatedRoute.fare_estimate = this.estimateFare(updatedRoute, updatedRoute.vehicle_type || (updatedRoute.driver?.vehicle?.vehicle_type || 'Economy'), updatedRoute.promo || null);
        return updatedRoute;
    }

    buildAlternateRoute(route) {
        const midpoint = {
            latitude: (route.pickup.latitude + route.dropoff.latitude) / 2 + 0.02,
            longitude: (route.pickup.longitude + route.dropoff.longitude) / 2 - 0.02
        };

        const alternate = this.buildRoute(route.pickup, route.dropoff, [{ label: 'Route B', ...midpoint }], route.driver);
        alternate.traffic_alert = 'Alternate route uses a less congested road segment.';
        return alternate;
    }

    /**
     * Islamabad Road Graph - 8 zones with weighted edges representing
     * main roads (Kashmir Highway, Jinnah Avenue, Faisal Avenue, etc.)
     */
    getIslamabadGraph() {
        const nodes = [
            { id: 'F10', label: 'F-10 Markaz', latitude: 33.6844, longitude: 73.0479, type: 'zone' },
            { id: 'F8',  label: 'F-8 Markaz',  latitude: 33.7114, longitude: 73.0545, type: 'zone' },
            { id: 'F6',  label: 'F-6 Super Market', latitude: 33.7291, longitude: 73.0946, type: 'zone' },
            { id: 'G9',  label: 'G-9 Markaz',  latitude: 33.6938, longitude: 73.0376, type: 'zone' },
            { id: 'G11', label: 'G-11 Markaz', latitude: 33.6750, longitude: 73.0170, type: 'zone' },
            { id: 'I8',  label: 'I-8 Markaz',  latitude: 33.6666, longitude: 73.0711, type: 'zone' },
            { id: 'BA',  label: 'Blue Area',   latitude: 33.7190, longitude: 73.1719, type: 'zone' },
            { id: 'JSM', label: 'Jinnah Super Market', latitude: 33.6873, longitude: 73.1614, type: 'zone' },
            // Interchange nodes for realistic routing
            { id: 'F7',  label: 'F-7 Junction', latitude: 33.7200, longitude: 73.0700, type: 'junction' },
            { id: 'G10', label: 'G-10 Junction', latitude: 33.6850, longitude: 73.0250, type: 'junction' },
            { id: 'I9',  label: 'I-9 Junction',  latitude: 33.6580, longitude: 73.0500, type: 'junction' },
            { id: 'S9',  label: 'S-9 Roundabout', latitude: 33.7000, longitude: 73.1200, type: 'junction' }
        ];

        const edges = [
            // Faisal Avenue corridor (north-south)
            { from: 'F6', to: 'F7', distance_km: 2.1, duration_min: 5, road_type: 'Avenue', status: 'Clear' },
            { from: 'F7', to: 'F8', distance_km: 1.8, duration_min: 4, road_type: 'Avenue', status: 'Clear' },
            { from: 'F8', to: 'F10', distance_km: 3.2, duration_min: 7, road_type: 'Avenue', status: 'Clear' },
            // Jinnah Avenue (east-west through Blue Area)
            { from: 'F7', to: 'S9', distance_km: 2.5, duration_min: 6, road_type: 'Avenue', status: 'Moderate' },
            { from: 'S9', to: 'BA', distance_km: 3.0, duration_min: 8, road_type: 'Avenue', status: 'Busy' },
            { from: 'S9', to: 'JSM', distance_km: 2.2, duration_min: 5, road_type: 'Urban', status: 'Clear' },
            // Kashmir Highway (west-east)
            { from: 'G11', to: 'G10', distance_km: 1.5, duration_min: 4, road_type: 'Highway', status: 'Clear' },
            { from: 'G10', to: 'G9', distance_km: 1.8, duration_min: 5, road_type: 'Highway', status: 'Moderate' },
            { from: 'G9', to: 'F10', distance_km: 1.4, duration_min: 3, road_type: 'Highway', status: 'Clear' },
            { from: 'G9', to: 'F8', distance_km: 2.0, duration_min: 5, road_type: 'Urban', status: 'Moderate' },
            // I-series corridor
            { from: 'I9', to: 'G10', distance_km: 2.0, duration_min: 5, road_type: 'Urban', status: 'Clear' },
            { from: 'I9', to: 'I8', distance_km: 1.5, duration_min: 4, road_type: 'Urban', status: 'Clear' },
            { from: 'I8', to: 'F10', distance_km: 2.2, duration_min: 6, road_type: 'Urban', status: 'Moderate' },
            { from: 'I8', to: 'F7', distance_km: 3.5, duration_min: 9, road_type: 'Urban', status: 'Moderate' },
            // Blue Area connections
            { from: 'BA', to: 'JSM', distance_km: 2.0, duration_min: 5, road_type: 'Urban', status: 'Clear' },
            { from: 'F6', to: 'S9', distance_km: 1.8, duration_min: 4, road_type: 'Urban', status: 'Clear' },
            { from: 'F6', to: 'BA', distance_km: 4.5, duration_min: 12, road_type: 'Avenue', status: 'Busy' },
            // Additional connectors
            { from: 'G11', to: 'I9', distance_km: 2.5, duration_min: 7, road_type: 'Urban', status: 'Clear' },
            { from: 'G10', to: 'F10', distance_km: 2.0, duration_min: 5, road_type: 'Urban', status: 'Clear' }
        ];

        // Build adjacency list (bidirectional)
        const adjacency = {};
        nodes.forEach(n => { adjacency[n.id] = []; });

        edges.forEach(edge => {
            const forwardEdge = { ...edge, to: edge.to, distance_km: edge.distance_km, duration_min: edge.duration_min };
            const reverseEdge = { ...edge, from: edge.to, to: edge.from, distance_km: edge.distance_km, duration_min: edge.duration_min };
            adjacency[edge.from].push(forwardEdge);
            adjacency[edge.to].push(reverseEdge);
        });

        return { nodes, edges, adjacency };
    }

    /**
     * Find nearest graph node to a given lat/lng
     */
    findNearestNode(graph, latitude, longitude) {
        let nearest = null;
        let minDist = Infinity;
        graph.nodes.forEach(node => {
            const d = calculateDistance(latitude, longitude, node.latitude, node.longitude);
            if (d < minDist) {
                minDist = d;
                nearest = node;
            }
        });
        return nearest;
    }

    /**
     * Build route using Islamabad graph for realistic sector routing
     */
    buildIslamabadRoute(pickup, dropoff, options = {}) {
        const graph = this.getIslamabadGraph();
        const startNode = this.findNearestNode(graph, pickup.latitude, pickup.longitude);
        const endNode = this.findNearestNode(graph, dropoff.latitude, dropoff.longitude);

        if (!startNode || !endNode) {
            return this.buildRoute(pickup, dropoff, [], null, options);
        }

        const trafficFactor = options.trafficFactor || this.computeTrafficFactor(this.getTrafficLevel(pickup, dropoff));
        const pathResult = this.findShortestPath(graph, startNode.id, endNode.id, trafficFactor);

        if (!pathResult.found) {
            return this.buildRoute(pickup, dropoff, [], null, options);
        }

        // Build route from graph path
        const routeNodes = pathResult.path;
        const steps = routeNodes.map((node, index) => {
            let distFromPrev = 0;
            let durFromPrev = 0;
            if (index > 0) {
                const prev = routeNodes[index - 1];
                const edge = graph.edges.find(e => e.from === prev.id && e.to === node.id);
                distFromPrev = edge ? edge.distance_km : calculateDistance(prev.latitude, prev.longitude, node.latitude, node.longitude);
                durFromPrev = edge ? Math.max(3, Math.round(edge.duration_min * trafficFactor)) : Math.max(3, Math.round(distFromPrev * 3.2));
            }
            return {
                id: `step-${index + 1}`,
                sequence: index + 1,
                node_id: node.id,
                label: node.label,
                type: node.type,
                status: index === 0 ? 'Pending' : 'Upcoming',
                distance_from_prev: Number(distFromPrev.toFixed(2)),
                duration_from_prev: durFromPrev,
                cumulative_distance: 0,
                cumulative_duration: 0,
                latitude: node.latitude,
                longitude: node.longitude
            };
        });

        // Calculate cumulative values
        let cumDist = 0, cumDur = 0;
        steps.forEach(step => {
            cumDist += step.distance_from_prev;
            cumDur += step.duration_from_prev;
            step.cumulative_distance = Number(cumDist.toFixed(2));
            step.cumulative_duration = cumDur;
            step.planned_eta = new Date(Date.now() + cumDur * 60000).toISOString();
        });

        const checkpoints = steps.map(s => ({
            id: s.node_id,
            label: s.label,
            type: s.type,
            sequence: s.sequence,
            status: s.sequence === 1 ? 'pending' : 'upcoming',
            distance_from_prev: s.distance_from_prev,
            duration_from_prev: s.duration_from_prev,
            cumulative_distance: s.cumulative_distance,
            cumulative_duration: s.cumulative_duration,
            latitude: s.latitude,
            longitude: s.longitude
        }));

        return {
            id: `isl-route-${Date.now()}`,
            pickup,
            dropoff,
            steps,
            checkpoints,
            stages: this.createStages(),
            distance_km: Number(cumDist.toFixed(2)),
            duration_min: cumDur,
            traffic_level: this.getTrafficLevel(pickup, dropoff),
            traffic_factor: trafficFactor,
            algorithm: 'islabad_graph_dijkstra',
            created_at: new Date().toISOString(),
            progress_pct: 0,
            status: 'requested',
            active_stage: 'requested'
        };
    }
}

window.routePlanner = new RoutePlanner();
