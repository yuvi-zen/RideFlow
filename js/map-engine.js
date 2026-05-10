/**
 * map-engine.js - Real interactive map system for RideFlow
 * Uses Leaflet.js + OSRM API for routing and OpenStreetMap tiles
 */

class RideFlowMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.polylines = [];
        this.watchId = null;
        this.currentPosition = null;
        this.isDarkMode = false;
        this.trafficLayer = null;

        this.init();
    }

    init() {
        // Initialize Leaflet map centered on Islamabad
        this.map = L.map(this.containerId, {
            center: [33.6844, 73.0479], // Islamabad coordinates
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });

        // Add tile layer (OpenStreetMap)
        this.updateTileLayer();

        // Add attribution
        this.map.attributionControl.addAttribution(
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ' +
            'Routing by <a href="http://project-osrm.org/">OSRM</a>'
        );

        // Add dark mode toggle control
        this.addDarkModeToggle();
    }

    updateTileLayer() {
        // Remove existing tile layer if any
        if (this.map.tileLayer) {
            this.map.removeLayer(this.map.tileLayer);
        }

        const tileUrl = this.isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        this.map.tileLayer = L.tileLayer(tileUrl, {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            subdomains: ['a', 'b', 'c']
        }).addTo(this.map);
    }

    addDarkModeToggle() {
        const DarkModeControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-control-darkmode');
                container.innerHTML = `
                    <button class="darkmode-toggle ${this.isDarkMode ? 'active' : ''}" title="Toggle Dark Mode">
                        ${this.isDarkMode ? '☀️' : '🌙'}
                    </button>
                `;
                container.onclick = () => this.toggleDarkMode();
                return container;
            }
        });

        new DarkModeControl().addTo(this.map);
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        this.updateTileLayer();

        // Update toggle button
        const toggle = document.querySelector('.darkmode-toggle');
        if (toggle) {
            toggle.classList.toggle('active', this.isDarkMode);
            toggle.innerHTML = this.isDarkMode ? '☀️' : '🌙';
        }
    }

    async initRiderView(pickupCoords, dropoffCoords) {
        this.clearMap();

        // Add pickup marker (pulsing green)
        const pickupMarker = L.marker([pickupCoords.lat, pickupCoords.lng], {
            icon: this.createPulsingIcon('🟢', '#00C896')
        }).addTo(this.map);
        this.markers.push(pickupMarker);

        // Add dropoff marker (red)
        const dropoffMarker = L.marker([dropoffCoords.lat, dropoffCoords.lng], {
            icon: this.createIcon('🔴', '#FF4757')
        }).addTo(this.map);
        this.markers.push(dropoffMarker);

        // Fetch routes from OSRM
        const routes = await this.fetchOSRMRoutes(pickupCoords, dropoffCoords);

        if (routes && routes.length > 0) {
            // Draw all routes
            routes.forEach((route, index) => {
                const color = index === 0 ? '#0066FF' : '#CCCCCC'; // Blue for fastest, gray for alternatives
                const weight = index === 0 ? 6 : 4;
                const dashArray = index === 0 ? null : '10, 10';

                const polyline = L.polyline(route.geometry, {
                    color: color,
                    weight: weight,
                    dashArray: dashArray,
                    opacity: index === 0 ? 0.8 : 0.5
                }).addTo(this.map);

                this.polylines.push(polyline);
            });

            // Auto-fit bounds
            const allCoords = routes.flatMap(route => route.geometry);
            this.map.fitBounds(allCoords, { padding: [20, 20] });

            // Show route cards
            this.showRouteCards(routes);

            return routes[0]; // Return fastest route
        }

        return null;
    }

    async initDriverView(driverCoords, rideRequest) {
        this.clearMap();

        // Add driver marker (car icon)
        const driverMarker = L.marker([driverCoords.lat, driverCoords.lng], {
            icon: this.createCarIcon(driverCoords.heading || 0)
        }).addTo(this.map);
        this.markers.push(driverMarker);

        // Add pickup marker (blinking)
        const pickupMarker = L.marker([rideRequest.pickup.lat, rideRequest.pickup.lng], {
            icon: this.createBlinkingIcon('📍', '#FF6B35')
        }).addTo(this.map);
        this.markers.push(pickupMarker);

        // Draw route from driver to pickup
        const route = await this.fetchOSRMRoute(driverCoords, rideRequest.pickup);

        if (route) {
            const polyline = L.polyline(route.geometry, {
                color: '#FF6B35',
                weight: 5,
                opacity: 0.8
            }).addTo(this.map);
            this.polylines.push(polyline);

            // Fit bounds
            this.map.fitBounds(route.geometry, { padding: [20, 20] });

            // Start ETA countdown
            this.startETACountdown(route.duration, driverMarker, route.geometry);

            return route;
        }

        return null;
    }

    startLiveTracking(role) {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePositionUpdate(position, role),
            (error) => this.handlePositionError(error),
            options
        );
    }

    handlePositionUpdate(position, role) {
        const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        if (this.currentPosition) {
            // Check for significant deviation
            const deviation = this.calculateHaversineDistance(this.currentPosition, newCoords);

            if (deviation > 0.05) { // 50 meters
                showToast('You are off route! Recalculating...', 'warning');
                // Recalculate route every 30 seconds if deviated
                if (!this.routeRecalcTimer) {
                    this.routeRecalcTimer = setTimeout(() => {
                        this.recalculateRoute(newCoords, role);
                        this.routeRecalcTimer = null;
                    }, 30000);
                }
            }

            // Smooth animation to new position
            this.animateMarkerToPosition(this.markers[0], newCoords);
        } else {
            // First position update
            this.updateMarkerPosition(this.markers[0], newCoords);
        }

        this.currentPosition = newCoords;
    }

    handlePositionError(error) {
        console.error('Geolocation error:', error);
        showToast('Unable to get your location', 'error');
    }

    animateMarkerToPosition(marker, targetCoords) {
        const startLatLng = marker.getLatLng();
        const startTime = Date.now();
        const duration = 1000; // 1 second animation

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Linear interpolation
            const lat = startLatLng.lat + (targetCoords.lat - startLatLng.lat) * progress;
            const lng = startLatLng.lng + (targetCoords.lng - startLatLng.lng) * progress;

            marker.setLatLng([lat, lng]);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    updateMarkerPosition(marker, coords) {
        if (marker) {
            marker.setLatLng([coords.lat, coords.lng]);
        }
    }

    recalculateRoute(currentCoords, role) {
        // Implementation would depend on current context
        console.log('Recalculating route from:', currentCoords);
    }

    showNearbyDrivers(riderCoords, driversArray) {
        // Clear existing driver markers
        this.markers.forEach(marker => {
            if (marker.options.driverMarker) {
                this.map.removeLayer(marker);
            }
        });

        // Use MinHeap to find 5 nearest drivers
        const nearestDrivers = this.findNearestDrivers(riderCoords, driversArray, 5);

        nearestDrivers.forEach((driver, index) => {
            const isTop3 = index < 3;
            const icon = this.createCarIcon(driver.heading || 0, isTop3);

            const marker = L.marker([driver.lat, driver.lng], {
                icon: icon,
                driverMarker: true
            }).addTo(this.map);

            this.markers.push(marker);

            // Draw dotted line to rider for top 3
            if (isTop3) {
                const line = L.polyline([riderCoords, {lat: driver.lat, lng: driver.lng}], {
                    color: '#6C63FF',
                    weight: 2,
                    dashArray: '5, 10',
                    opacity: 0.6
                }).addTo(this.map);
                this.polylines.push(line);
            }
        });
    }

    findNearestDrivers(riderCoords, driversArray, count) {
        // Simple implementation - sort by distance
        const driversWithDistance = driversArray.map(driver => ({
            ...driver,
            distance: this.calculateHaversineDistance(riderCoords, driver)
        }));

        driversWithDistance.sort((a, b) => a.distance - b.distance);
        return driversWithDistance.slice(0, count);
    }

    addTrafficLayer() {
        // Clear existing traffic layer
        if (this.trafficLayer) {
            this.map.removeLayer(this.trafficLayer);
        }

        // For demo purposes, color-code existing routes with random traffic data
        this.polylines.forEach(polyline => {
            // Remove existing polyline
            this.map.removeLayer(polyline);

            // Create traffic-colored segments
            const latlngs = polyline.getLatLngs();
            const segments = [];

            for (let i = 0; i < latlngs.length - 1; i++) {
                const segment = [latlngs[i], latlngs[i + 1]];
                const trafficLevel = Math.random();

                let color;
                if (trafficLevel < 0.3) color = '#00C896'; // Fast - green
                else if (trafficLevel < 0.7) color = '#FFB020'; // Moderate - yellow
                else color = '#FF4757'; // Slow - red

                const trafficSegment = L.polyline(segment, {
                    color: color,
                    weight: 6,
                    opacity: 0.8
                }).addTo(this.map);

                segments.push(trafficSegment);
            }

            this.trafficLayer = L.layerGroup(segments);
        });
    }

    // OSRM API Integration
    async fetchOSRMRoutes(startCoords, endCoords) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=full&alternatives=2&steps=false`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                return data.routes.map(route => ({
                    geometry: this.decodePolyline(route.geometry),
                    distance: route.distance / 1000, // Convert to km
                    duration: Math.round(route.duration / 60), // Convert to minutes
                    fare: this.calculateFare(route.distance / 1000, route.duration / 60)
                }));
            }
        } catch (error) {
            console.error('OSRM API error:', error);
            showToast('Unable to fetch routes', 'error');
        }

        return null;
    }

    async fetchOSRMRoute(startCoords, endCoords) {
        const routes = await this.fetchOSRMRoutes(startCoords, endCoords);
        return routes ? routes[0] : null;
    }

    decodePolyline(encoded) {
        // Simple polyline decoder (for OSRM format)
        const points = [];
        let index = 0, lat = 0, lng = 0;

        while (index < encoded.length) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push([lat * 1e-5, lng * 1e-5]);
        }

        return points;
    }

    calculateFare(distance, duration) {
        // Simple fare calculation (can be enhanced)
        const baseFare = 50;
        const perKm = 18;
        const perMinute = 5;
        return Math.round(baseFare + (distance * perKm) + (duration * perMinute));
    }

    // Utility methods
    createIcon(emoji, color = '#0066FF') {
        return L.divIcon({
            html: `<div style="background: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });
    }

    createPulsingIcon(emoji, color) {
        return L.divIcon({
            html: `<div class="pulsing-marker" style="background: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: rfPulse 2s infinite;">${emoji}</div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });
    }

    createBlinkingIcon(emoji, color) {
        return L.divIcon({
            html: `<div class="blinking-marker" style="background: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); animation: blink 1s infinite;">${emoji}</div>`,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });
    }

    createCarIcon(heading = 0, isHighlighted = false) {
        const color = isHighlighted ? '#FF6B35' : '#6B7A99';
        return L.divIcon({
            html: `<div style="transform: rotate(${heading}deg); font-size: 20px;">🚗</div>`,
            className: 'car-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }

    calculateHaversineDistance(coord1, coord2) {
        const R = 6371; // Earth's radius in km
        const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
        const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    showRouteCards(routes) {
        // Create route cards container
        let cardsContainer = document.getElementById('route-cards');
        if (!cardsContainer) {
            cardsContainer = document.createElement('div');
            cardsContainer.id = 'route-cards';
            cardsContainer.className = 'route-cards-container';
            document.getElementById(this.containerId).parentNode.appendChild(cardsContainer);
        }

        cardsContainer.innerHTML = routes.map((route, index) => `
            <div class="route-card ${index === 0 ? 'selected' : ''}" onclick="selectRoute(${index})">
                <div class="route-header">
                    <span class="route-label">${index === 0 ? 'Fastest' : `Option ${index + 1}`}</span>
                    <span class="route-time">${route.duration} min</span>
                </div>
                <div class="route-details">
                    <span class="route-distance">${route.distance.toFixed(1)} km</span>
                    <span class="route-fare">Rs. ${route.fare}</span>
                </div>
            </div>
        `).join('');
    }

    startETACountdown(initialMinutes, marker, routeGeometry) {
        let remainingSeconds = initialMinutes * 60;
        let animationIndex = 0;

        const updateCountdown = () => {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;

            // Update ETA display
            const etaDisplay = document.getElementById('driver-eta');
            if (etaDisplay) {
                etaDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Animate car along route
            if (routeGeometry && animationIndex < routeGeometry.length - 1) {
                const progress = 1 - (remainingSeconds / (initialMinutes * 60));
                const targetIndex = Math.floor(progress * (routeGeometry.length - 1));
                if (targetIndex !== animationIndex) {
                    animationIndex = targetIndex;
                    this.animateMarkerToPosition(marker, {
                        lat: routeGeometry[animationIndex][0],
                        lng: routeGeometry[animationIndex][1]
                    });
                }
            }

            remainingSeconds--;

            if (remainingSeconds >= 0) {
                setTimeout(updateCountdown, 1000);
            } else {
                showToast('You have arrived at the pickup location!', 'success');
            }
        };

        updateCountdown();
    }

    clearMap() {
        // Clear markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Clear polylines
        this.polylines.forEach(polyline => this.map.removeLayer(polyline));
        this.polylines = [];

        // Clear route cards
        const cardsContainer = document.getElementById('route-cards');
        if (cardsContainer) {
            cardsContainer.remove();
        }
    }

    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        if (this.map) {
            this.map.remove();
        }
    }
}

// Global function for route selection
function selectRoute(index) {
    // Update selected route card styling
    document.querySelectorAll('.route-card').forEach((card, i) => {
        card.classList.toggle('selected', i === index);
    });
}