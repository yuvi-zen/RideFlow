/**
 * mapManager.js — RideFlow Live Map Manager
 * Leaflet.js + Leaflet Routing Machine + navigator.geolocation
 * Free, no API key, no payment required.
 *
 * NOTE: This project uses OpenStreetMap/Leaflet — NO API KEY needed.
 * If migrating to Google Maps, add: const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY';
 * and replace Leaflet calls with google.maps equivalents.
 */

(function () {
    'use strict';

    // ── Inject map-specific CSS once ──────────────────────────────
    if (!document.getElementById('rf-map-css')) {
        const style = document.createElement('style');
        style.id = 'rf-map-css';
        style.textContent = `
            .rf-user-dot {
                width: 16px; height: 16px; border-radius: 50%;
                background: #2563eb; border: 3px solid white;
                box-shadow: 0 0 0 0 rgba(37,99,235,0.4);
                animation: rf-pulse-dot 2s infinite;
            }
            @keyframes rf-pulse-dot {
                0%   { box-shadow: 0 0 0 0   rgba(37,99,235,0.4); }
                70%  { box-shadow: 0 0 0 12px rgba(37,99,235,0); }
                100% { box-shadow: 0 0 0 0   rgba(37,99,235,0); }
            }
            .rf-pickup-pin {
                width: 14px; height: 14px; border-radius: 50%;
                background: #16a34a; border: 3px solid white;
            }
            .rf-dropoff-pin {
                width: 14px; height: 14px; border-radius: 50%;
                background: #dc2626; border: 3px solid white;
            }
            .rf-car-icon {
                font-size: 22px; line-height: 1;
            }
            .rf-toast {
                position: fixed; bottom: 24px; right: 24px;
                padding: 10px 18px; border-radius: 8px;
                font-size: 14px; color: white; z-index: 9999;
                transition: opacity 0.4s; max-width: 300px; line-height: 1.4;
                font-family: 'Inter', system-ui, sans-serif;
            }
            .rf-toast.success { background: #16a34a; }
            .rf-toast.error   { background: #dc2626; }
            .rf-toast.info    { background: #2563eb; }

            /* Hide Leaflet Routing Machine default turn-by-turn panel */
            .leaflet-routing-container { display: none !important; }

            /* Prevent map overflow */
            .leaflet-container { max-width: 100%; box-sizing: border-box; }
        `;
        document.head.appendChild(style);
    }

    // ── RideFlowMap constructor ───────────────────────────────────
    function RideFlowMap() {
        this.map = null;
        this.userMarker = null;
        this.pickupMarker = null;
        this.dropoffMarker = null;
        this.routingControl = null;
        this.watchId = null;
        this.routePath = null;
        this.driverMarker = null;
        this._driverInterval = null;
        this._firstLocationUpdate = true;
        this._driverTrackingActive = false;
        this._clickCount = 0;
    }

    // ── 1. initMap ────────────────────────────────────────────────
    RideFlowMap.prototype.initMap = function (containerId, centerLat, centerLng, zoom) {
        // Check if Leaflet loaded
        if (typeof L === 'undefined') {
            this._toast('Map unavailable. Check your internet connection.', 'error');
            var container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f3f4f6;color:#6b7280;font-size:14px;border-radius:12px;">Map unavailable. Check your internet connection.</div>';
            }
            return null;
        }

        // Destroy any existing map first
        this.destroyMap();

        var lat = centerLat || 33.6844;
        var lng = centerLng || 73.0479;
        var z = zoom || 13;

        var container = document.getElementById(containerId);
        if (!container) {
            this._toast('Map container not found: ' + containerId, 'error');
            return null;
        }

        // Refuse to initialize on a hidden container (Leaflet sizing bug)
        if (container.offsetParent === null || container.offsetHeight === 0) {
            this._toast('Cannot init map on hidden container. Wait until visible.', 'error');
            return null;
        }

        this.map = L.map(containerId, {
            center: [lat, lng],
            zoom: z,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Invalidate size after container is fully visible
        var self = this;
        setTimeout(function () {
            if (self.map) self.map.invalidateSize();
        }, 100);

        return this.map;
    };

    // ── 2. startLiveTracking ──────────────────────────────────────
    RideFlowMap.prototype.startLiveTracking = function (onLocationUpdate) {
        var self = this;
        this._firstLocationUpdate = true;

        if (!navigator.geolocation) {
            this._toast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;

                if (!self.userMarker) {
                    var userIcon;
                    if (self._driverTrackingActive) {
                        // Driver mode: use car icon
                        userIcon = L.divIcon({
                            className: '',
                            html: '<div class="rf-car-icon">\uD83D\uDE97</div>',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14]
                        });
                    } else {
                        // Rider mode: blue pulsing dot
                        userIcon = L.divIcon({
                            className: '',
                            html: '<div class="rf-user-dot"></div>',
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        });
                    }

                    self.userMarker = L.marker([lat, lng], { icon: userIcon })
                        .addTo(self.map)
                        .bindTooltip(self._driverTrackingActive ? 'Your car' : 'You are here', { direction: 'top', offset: [0, -10] });
                } else {
                    self.userMarker.setLatLng([lat, lng]);
                }

                // Pan to user on first update
                if (self._firstLocationUpdate) {
                    self.map.setView([lat, lng], 14);
                    self._firstLocationUpdate = false;
                }

                if (typeof onLocationUpdate === 'function') {
                    onLocationUpdate(lat, lng);
                }
            },
            function (error) {
                switch (error.code) {
                    case 1:
                        self._toast('Location access needed for live tracking. Please allow location in your browser settings.', 'error');
                        break;
                    case 2:
                        self._toast('Location unavailable. Check your device GPS.', 'error');
                        break;
                    case 3:
                        self._toast('Location request timed out. Retrying...', 'info');
                        break;
                    default:
                        self._toast('Unknown location error.', 'error');
                }
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    };

    // ── 3. stopLiveTracking ───────────────────────────────────────
    RideFlowMap.prototype.stopLiveTracking = function () {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    };

    // ── 4. setPickupMarker ────────────────────────────────────────
    RideFlowMap.prototype.setPickupMarker = function (lat, lng, label) {
        if (this.pickupMarker) {
            this.map.removeLayer(this.pickupMarker);
        }

        var icon = L.divIcon({
            className: '',
            html: '<div class="rf-pickup-pin"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        this.pickupMarker = L.marker([lat, lng], { icon: icon })
            .addTo(this.map)
            .bindPopup(label || 'Pickup');

        return this.pickupMarker;
    };

    // ── 5. setDropoffMarker ───────────────────────────────────────
    RideFlowMap.prototype.setDropoffMarker = function (lat, lng, label) {
        if (this.dropoffMarker) {
            this.map.removeLayer(this.dropoffMarker);
        }

        var icon = L.divIcon({
            className: '',
            html: '<div class="rf-dropoff-pin"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        this.dropoffMarker = L.marker([lat, lng], { icon: icon })
            .addTo(this.map)
            .bindPopup(label || 'Destination');

        return this.dropoffMarker;
    };

    // ── 6. drawRoute ──────────────────────────────────────────────
    RideFlowMap.prototype.drawRoute = function (fromLat, fromLng, toLat, toLng, onRouteReady) {
        var self = this;

        // Remove existing route
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
        }

        try {
            this.routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(fromLat, fromLng),
                    L.latLng(toLat, toLng)
                ],
                routeWhileDragging: false,
                show: false,
                lineOptions: {
                    styles: [{ color: '#2563eb', weight: 5, opacity: 0.8 }],
                    addWaypoints: false
                },
                createMarker: function () { return null; },
                fitSelectedRoutes: true
            }).addTo(this.map);

            this.routingControl.on('routesfound', function (e) {
                var routes = e.routes;
                if (!routes || routes.length === 0) return;

                var route = routes[0];
                self.routePath = route.coordinates;

                var totalDistance = Math.round((route.summary.totalDistance / 1000) * 10) / 10; // km, 1 decimal
                var totalTime = Math.round(route.summary.totalTime / 60); // minutes

                var rideType = window.selectedRideType || 'economy';
                var rates = { bike: 15, economy: 25, comfort: 35, premium: 50 };
                var baseFares = { bike: 50, economy: 80, comfort: 120, premium: 200 };
                var fare = Math.round((baseFares[rideType] || 80) + ((rates[rideType] || 25) * totalDistance));

                if (typeof onRouteReady === 'function') {
                    onRouteReady({
                        distance: totalDistance,
                        duration: totalTime,
                        fare: fare
                    });
                }
            });

            this.routingControl.on('routingerror', function () {
                // Fallback: draw a straight polyline if OSRM fails (offline mode)
                self._toast('Could not calculate road route. Drawing direct line.', 'info');
                var polyline = L.polyline([
                    [fromLat, fromLng],
                    [toLat, toLng]
                ], { color: '#2563eb', weight: 5, opacity: 0.8, dashArray: '8, 12' }).addTo(self.map);
                self.map.fitBounds(polyline.getBounds());

                // Estimate straight-line distance
                var distKm = self._haversine(fromLat, fromLng, toLat, toLng);
                var durationMin = Math.round(distKm * 2.5); // rough estimate
                var rideType = window.selectedRideType || 'economy';
                var rates = { bike: 15, economy: 25, comfort: 35, premium: 50 };
                var baseFares = { bike: 50, economy: 80, comfort: 120, premium: 200 };
                var fare = Math.round((baseFares[rideType] || 80) + ((rates[rideType] || 25) * distKm));

                self.routePath = [L.latLng(fromLat, fromLng), L.latLng(toLat, toLng)];

                if (typeof onRouteReady === 'function') {
                    onRouteReady({
                        distance: Math.round(distKm * 10) / 10,
                        duration: durationMin,
                        fare: fare
                    });
                }
            });
        } catch (err) {
            self._toast('Could not calculate route. Check your internet connection.', 'error');
        }
    };

    // ── 7. simulateDriverMovement ─────────────────────────────────
    RideFlowMap.prototype.simulateDriverMovement = function (onStep, onArrived) {
        var self = this;

        if (!this.routePath || this.routePath.length === 0) {
            this._toast('No route loaded', 'error');
            return;
        }

        // Clear any previous simulation
        if (this._driverInterval) {
            clearInterval(this._driverInterval);
            this._driverInterval = null;
        }
        if (this.driverMarker) {
            this.map.removeLayer(this.driverMarker);
        }

        var carIcon = L.divIcon({
            className: '',
            html: '<div class="rf-car-icon">\uD83D\uDE97</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        var currentStep = 0;
        // Skip points for faster simulation (every 3rd point)
        var stepSize = Math.max(1, Math.floor(this.routePath.length / 60));
        this.driverMarker = L.marker(this.routePath[0], { icon: carIcon }).addTo(this.map);

        this._driverInterval = setInterval(function () {
            currentStep += stepSize;
            if (currentStep >= self.routePath.length) {
                clearInterval(self._driverInterval);
                self._driverInterval = null;
                if (typeof onArrived === 'function') onArrived();
                self._toast('Driver has arrived', 'success');
                return;
            }

            self.driverMarker.setLatLng(self.routePath[currentStep]);

            if (typeof onStep === 'function') {
                onStep(currentStep, self.routePath.length);
            }
        }, 1500);
    };

    // ── 8. destroyMap ─────────────────────────────────────────────
    RideFlowMap.prototype.destroyMap = function () {
        this.stopLiveTracking();

        // Stop driver simulation
        if (this._driverInterval) {
            clearInterval(this._driverInterval);
            this._driverInterval = null;
        }

        if (this.routingControl && this.map) {
            try { this.map.removeControl(this.routingControl); } catch (e) { /* ignore */ }
            this.routingControl = null;
        }

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.userMarker = null;
        this.pickupMarker = null;
        this.dropoffMarker = null;
        this.driverMarker = null;
        this._riderDriverMarker = null;
        this.routePath = null;
        this._firstLocationUpdate = true;
        this._driverTrackingActive = false;
        this._clickCount = 0;
    };

    // ── 9. showToast (internal) ──────────────────────────────────
    RideFlowMap.prototype._toast = function (message, type) {
        // Use global showToast if available (from toast.js)
        if (typeof window.showToast === 'function') {
            window.showToast(message, type || 'info');
            return;
        }

        // Fallback: create our own toast
        var t = document.createElement('div');
        t.className = 'rf-toast ' + (type || 'info');
        t.textContent = message;
        document.body.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { t.remove(); }, 400);
        }, 4000);
    };

    // ── Haversine helper ──────────────────────────────────────────
    RideFlowMap.prototype._haversine = function (lat1, lon1, lat2, lon2) {
        var R = 6371; // km
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // ── Update route fare when ride type changes ──────────────────
    RideFlowMap.prototype.recalculateFare = function () {
        if (!this.routePath || this.routePath.length === 0) return null;

        // Calculate total distance from route path
        var totalDist = 0;
        for (var i = 1; i < this.routePath.length; i++) {
            totalDist += this._haversine(
                this.routePath[i - 1].lat, this.routePath[i - 1].lng,
                this.routePath[i].lat, this.routePath[i].lng
            );
        }

        var rideType = window.selectedRideType || 'economy';
        var rates = { bike: 15, economy: 25, comfort: 35, premium: 50 };
        var baseFares = { bike: 50, economy: 80, comfort: 120, premium: 200 };
        return Math.round((baseFares[rideType] || 80) + ((rates[rideType] || 25) * Math.round(totalDist * 10) / 10));
    };

    // ── Map click to place markers ────────────────────────────────
    RideFlowMap.prototype._setupClickPlacement = function () {
        var self = this;
        if (!this.map) return;

        this._clickCount = 0;

        this.map.on('click', function (e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;

            if (self._clickCount === 0) {
                // First click: place green pickup marker
                self.setPickupMarker(lat, lng, 'Pickup');
                self._clickCount++;
                // Update the From input field
                var pickupInput = document.getElementById('pickup-input');
                if (pickupInput) {
                    pickupInput.value = 'Map Pin (' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ')';
                    pickupInput.style.color = '';
                }
            } else if (self._clickCount === 1) {
                // Second click: place red dropoff marker
                self.setDropoffMarker(lat, lng, 'Destination');
                self._clickCount++;
                // Update the To input field
                var dropoffInput = document.getElementById('dropoff-input');
                if (dropoffInput) {
                    dropoffInput.value = 'Map Pin (' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ')';
                }
            } else {
                // Subsequent clicks: move dropoff marker
                self.setDropoffMarker(lat, lng, 'Destination');
                var dropoffInput2 = document.getElementById('dropoff-input');
                if (dropoffInput2) {
                    dropoffInput2.value = 'Map Pin (' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ')';
                }
            }

            // Auto-draw route when both markers are placed
            if (self.pickupMarker && self.dropoffMarker) {
                var from = self.pickupMarker.getLatLng();
                var to = self.dropoffMarker.getLatLng();
                self.drawRoute(from.lat, from.lng, to.lat, to.lng);
            }

            // Trigger button validation
            if (typeof window.validateFindDriver === 'function') {
                window.validateFindDriver();
            }
        });
    };

    // ── Aliases for API compatibility ─────────────────────────────
    RideFlowMap.prototype.initRiderMap = function (containerId) {
        var result = this.initMap(containerId, 33.6844, 73.0479, 13);
        if (result) this._setupClickPlacement();
        return result;
    };
    RideFlowMap.prototype.initDriverMap = function (containerId) {
        var result = this.initMap(containerId, 33.6844, 73.0479, 13);
        if (result) {
            // Set up driver car marker at GPS position
            var self = this;
            this._driverTrackingActive = true;
        }
        return result;
    };
    RideFlowMap.prototype.setPickup = function (lat, lng, label) {
        return this.setPickupMarker(lat, lng, label);
    };
    RideFlowMap.prototype.setDropoff = function (lat, lng, label) {
        return this.setDropoffMarker(lat, lng, label);
    };

    // ── Export ─────────────────────────────────────────────────────
    window.RideFlowMap = new RideFlowMap();
    window.selectedRideType = window.selectedRideType || 'economy';

    // ── Islamabad Locations ───────────────────────────────────────
    var ISLAMABAD_LOCATIONS = {
        "F-7 Markaz":        { lat: 33.7269, lng: 73.0533 },
        "Blue Area":         { lat: 33.7238, lng: 73.0879 },
        "G-9 Markaz":        { lat: 33.6844, lng: 73.0479 },
        "Centaurus Mall":    { lat: 33.7156, lng: 73.0670 },
        "Pindora":           { lat: 33.6600, lng: 73.0200 },
        "Bahria Town":       { lat: 33.5553, lng: 72.9778 },
        "DHA Phase 2":       { lat: 33.5370, lng: 73.1183 },
        "Rawalpindi Saddar": { lat: 33.6007, lng: 73.0679 },
        "Faizabad":          { lat: 33.7080, lng: 73.0718 },
        "PWD Colony":        { lat: 33.6447, lng: 73.0947 }
    };

    window.RideFlowLocations = ISLAMABAD_LOCATIONS;

})();
