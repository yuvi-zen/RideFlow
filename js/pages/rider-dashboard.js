/**
 * Rider-Dashboard.js - Rider Dashboard Page
 * Shows ride request, current ride tracking, history, payments, ratings, complaints, profile, and support.
 */

// MinHeap for driver matching
class MinHeap {
    constructor() {
        this.heap = [];
    }

    insert(item, priority) {
        this.heap.push({ item, priority });
        this.bubbleUp(this.heap.length - 1);
    }

    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }

    extractAll() {
        const result = [];
        while (this.heap.length > 0) {
            result.push(this.extractMin().item);
        }
        return result;
    }

    extractMin() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();

        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.sinkDown(0);
        return min;
    }

    sinkDown(index) {
        const length = this.heap.length;
        while (true) {
            let left = 2 * index + 1;
            let right = 2 * index + 2;
            let smallest = index;

            if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
                smallest = left;
            }
            if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
                smallest = right;
            }
            if (smallest === index) break;

            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}

class RiderDashboard {
    constructor() {
        // FIX 1 & 2: Removed invalid super() call — RiderDashboard does not extend any class.
        // super() is only valid inside a subclass constructor and must precede any this.* usage.

        this.container = document.getElementById('main-content');
        this.currentUser = getCurrentUser();
        this.layout = null;
        this.section = getCurrentRoute().section || 'overview';
        this.currentRide = null;
        this.promoCode = null;           // FIX 4: Removed duplicate assignment that appeared later in constructor
        this.fareEstimate = null;
        this.estimatedRoute = null;
        this.hashChangeListenerAdded = false;
        this.handleHashChange = this.handleHashChange.bind(this);

        // FIX 3: Removed redundant this.MinHeap re-definition. The top-level MinHeap class
        // is already accessible in scope; shadowing it as an instance property served no purpose
        // and would never be used since all internal references go to the class directly.

        this.currentPage = 1;
        this.expandedRide = null;
        this.selectedRating = 0;
        this.selectedVehicle = 'economy';
        this.selectedPayment = 'cash';
        this.bookingMap = null;
        this.activeRideMap = null;
        this.etaInterval = null;
        this._rideUnsubscribe = null;
        this._lastCalculatedFare = 0;
        this._lastCalculatedDistance = 0;
        this._lastCalculatedEta = 0;
    }

    async render() {
        // Always refresh user from storage on render (fixes post-login stale state)
        this.currentUser = authStorage.getCurrentUser() || getCurrentUser();
        this.section = getCurrentRoute().section || 'overview';
        this.layout = new RiderLayout({ user: this.currentUser });
        this.layout.render(this.section);

        const content = document.getElementById('rider-dashboard-content');
        if (content) {
            content.addEventListener('riderPanelChange', (event) => {
                navigateTo('rider-dashboard', event.detail.panel);
            });
        }

        if (!this.hashChangeListenerAdded) {
            window.addEventListener('hashchange', this.handleHashChange);
            this.hashChangeListenerAdded = true;
        }

        // Load data from backend
        try {
            await this.loadRideHistory();
            await this.loadCurrentRide();
        } catch (e) {
            console.error('Failed to load rider data:', e);
        }

        this.renderSection(this.section);
    }

    async loadCurrentRide() {
        try {
            const response = await riderAPI.getCurrentRide(this.currentUser.id);
            this.currentRide = response.data;
        } catch (error) {
            this.currentRide = null;
        }
    }

    getRideLocationLabel(ride, type) {
        if (!ride) return 'TBD';
        if (type === 'pickup') {
            if (ride.pickup_location) return ride.pickup_location;
            const location = mockLocations.find(loc => loc.id === ride.pickup_location_id);
            return location?.address || location?.city || 'TBD';
        }
        if (ride.dropoff_location) return ride.dropoff_location;
        const location = mockLocations.find(loc => loc.id === ride.dropoff_location_id);
        return location?.address || location?.city || 'TBD';
    }

    getRideDriverName(ride) {
        if (!ride || !ride.driver_id) return 'Unassigned';
        const driver = mockUsers.find(u => u.id === ride.driver_id);
        return driver?.full_name || 'Unassigned';
    }

    getRatingStars(score) {
        if (!score || score < 1) return 'No rating yet';
        return '⭐'.repeat(Math.max(1, Math.min(5, score)));
    }

    handleHashChange() {
        const route = getCurrentRoute();
        if (route.page === 'rider-dashboard') {
            const section = route.section || 'overview';
            if (section !== this.section) {
                this.renderSection(section);
            }
        }
    }

    renderSection(section) {
        this.section = section || 'overview';
        this.layout.setActive(this.section);

        // Clean up any live map before switching sections
        if (window.RideFlowMap) RideFlowMap.destroyMap();

        const container = document.getElementById('rider-dashboard-content');
        if (!container) return;

        container.innerHTML = '';

        switch (this.section) {
            case 'overview':
                this.renderOverview(container);
                break;
            case 'request':
                this.renderRequest(container);
                break;
            case 'rides':
                this.renderRideHistory(container);
                break;
            case 'payments':
                this.renderPayments(container);
                break;
            case 'ratings':
                this.renderRatings(container);
                break;
            case 'complaints':
                this.renderComplaints(container);
                break;
            case 'profile':
                this.renderProfile(container);
                break;
            case 'support':
                this.renderSupport(container);
                break;
            default:
                this.renderOverview(container);
        }
    }

    renderOverview(container) {
        const activeRide = this.currentRide && ['Requested', 'Accepted', 'Driver En Route', 'In Progress'].includes(this.currentRide.status);
        const route = activeRide && typeof routePlanner !== 'undefined' ? routePlanner.createRouteFromRide(this.currentRide) : null;
        const progressRoute = route ? routePlanner.advanceRouteProgress(route, 6) : null;
        const activeDriver = activeRide ? mockDrivers.find(d => d.id === this.currentRide.driver_id) : null;
        const activeVehicle = activeDriver ? mockVehicles.find(v => v.driver_id === activeDriver.id) : null;

        // Quick stats using real data
        const myRides = this.rideHistory || [];
        const completedRides = myRides.filter(r => r.status === 'Completed');
        const totalSpent = completedRides.reduce((sum, r) => sum + (parseFloat(r.final_fare) || 0), 0);
        const recent3 = completedRides.slice(0, 3);

        container.innerHTML = `
            <!-- Demo Banner -->
            <div style="background:linear-gradient(135deg, var(--rf-primary), var(--rf-primary-mid));color:#000;padding:10px 20px;text-align:center;font-size:13px;font-weight:700;border-radius:10px;margin-bottom:16px;box-shadow: 0 4px 15px rgba(0,255,255,0.3);">
                ✨ Demo Mode — Simulated rides & drivers. No real transactions.
            </div>

            <div class="dashboard-header">
                <h1>Welcome, ${this.currentUser.full_name}</h1>
                <p>Live tracking, driver arrival, and safety tools for every trip.</p>
            </div>

            <!-- Quick Stats Row -->
            <div class="grid-4" style="gap: 16px; margin-top: 20px;">
                <div class="card" style="text-align:center;padding:18px;">
                    <div style="font-size:28px;font-weight:700;color:var(--rf-rider-primary, #2563eb);">${completedRides.length}</div>
                    <div class="text-muted" style="font-size:13px;">Completed Rides</div>
                </div>
                <div class="card" style="text-align:center;padding:18px;">
                    <div style="font-size:28px;font-weight:700;color:var(--rf-success, #16a34a);">${formatCurrency(totalSpent)}</div>
                    <div class="text-muted" style="font-size:13px;">Total Spent</div>
                </div>
                <div class="card" style="text-align:center;padding:18px;">
                    <div style="font-size:28px;font-weight:700;color:var(--rf-warning, #f59e0b);">${activeRide ? '1' : '0'}</div>
                    <div class="text-muted" style="font-size:13px;">Active Ride</div>
                </div>
                <div class="card" style="text-align:center;padding:18px;">
                    <div style="font-size:28px;font-weight:700;color:var(--rf-danger, #dc2626);">${(mockComplaints || []).filter(c => c.filed_by === this.currentUser.id && c.status === 'Open').length}</div>
                    <div class="text-muted" style="font-size:13px;">Open Complaints</div>
                </div>
            </div>

            <div class="grid-3" style="gap: 18px; margin-top: 24px;">
                <div class="card">
                    <div class="card-header"><h3>Current Ride</h3></div>
                    <div class="card-body">
                        ${activeRide ? `
                            <p><strong>Status:</strong> ${this.currentRide.status}</p>
                            <p><strong>Pickup:</strong> ${this.getRideLocationLabel(this.currentRide, 'pickup')}</p>
                            <p><strong>Drop-off:</strong> ${this.getRideLocationLabel(this.currentRide, 'dropoff')}</p>
                            <p><strong>Driver:</strong> ${this.getRideDriverName(this.currentRide)}</p>
                            <p><strong>Vehicle:</strong> ${activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : 'TBD'}</p>
                            ${activeDriver ? `<p><strong>Driver rating:</strong> ${activeDriver.average_rating || 'N/A'} / 5</p>` : ''}
                        ` : '<p class="text-muted">No active ride at the moment.</p>'}
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Trip Controls</h3></div>
                    <div class="card-body">
                        <p class="text-muted">Share your trip, get emergency support, or cancel with reason.</p>
                        <div class="shared-safety-actions" style="display:flex;flex-wrap:wrap;gap:8px;">
                            <button class="btn btn-primary" onclick="navigateTo('rider-dashboard','support')">Share Trip</button>
                            <button class="btn btn-danger" onclick="navigateTo('rider-dashboard','support')">SOS Emergency</button>
                            <button class="btn btn-secondary" onclick="navigateTo('rider-dashboard','support')">Lost Item</button>
                            ${activeRide ? `<button class="btn btn-warning" onclick="riderDash.cancelRideWithReason()">Cancel Ride</button>` : ''}
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Recent Rides</h3></div>
                    <div class="card-body">
                        ${recent3.length > 0 ? recent3.map(ride => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--rf-border, #e2e8f0);">
                                <div>
                                    <div style="font-weight:600;font-size:14px;">${this.getRideLocationLabel(ride, 'pickup')} → ${this.getRideLocationLabel(ride, 'dropoff')}</div>
                                    <div class="text-muted" style="font-size:12px;">${formatDate(ride.created_at)}</div>
                                </div>
                                <div style="font-weight:700;color:var(--rf-rider-primary);">${formatCurrency(ride.fare_amount || 0)}</div>
                            </div>
                        `).join('') : '<p class="text-muted">No completed rides yet.</p>'}
                        <button class="btn btn-outline" style="margin-top:12px;" onclick="navigateTo('rider-dashboard','rides')">View All Rides</button>
                    </div>
                </div>
            </div>
        `;

        if (activeRide) {
            const rideSummary = document.createElement('div');
            rideSummary.innerHTML = `
                <div class="route-map-panel">
                    <div class="route-map-header">
                        <div>
                            <div class="map-title">Live driver arrival</div>
                            <div class="map-meta">Tracking your ride and ETA in real time.</div>
                        </div>
                        <div class="map-status">${this.currentRide.status}</div>
                    </div>
                    <div id="rider-live-map" class="route-map"></div>
                    <div class="route-map-footer">
                        <div class="map-stat"><span>Next stop</span><strong>${route.pickup.label}</strong></div>
                        <div class="map-stat"><span>ETA</span><strong>${formatTime(progressRoute.eta)}</strong></div>
                        <div class="map-stat"><span>Progress</span><strong>${progressRoute.progress_pct}%</strong></div>
                    </div>
                    <div class="route-progress-bar"><div class="route-progress-fill" style="width:${progressRoute.progress_pct}%"></div></div>
                    <div class="route-note">${activeDriver ? `${activeDriver.average_rating.toFixed(1)}⭐ • ${activeDriver.verification_status === 'Verified' ? '✅ Verified driver' : '⚠️ Unverified'} • ${activeVehicle ? `${activeVehicle.make} ${activeVehicle.model} ${activeVehicle.verification_status === 'Verified' ? '✅ Verified vehicle' : '⚠️ Unverified'}` : 'Vehicle info pending'}` : 'Driver details will appear when available.'}</div>
                </div>
            `;
            container.appendChild(rideSummary);
            new RouteMap('rider-live-map').render(progressRoute);
        }
    }

    renderRequest(container) {
        this.renderBookRide(container);
    }

    // === SECTION 1: renderBookRide() — The hero feature ===
    renderBookRide(container) {
        const locationOptions = (mockLocations || []).map(l => `<option value="${l.address}">`).join('');
        const islamabadOptions = Object.keys(window.RideFlowLocations || {}).map(name => `<option value="${name}">`).join('');

        container.innerHTML = `
            <div class="book-ride-layout">
                <!-- LEFT PANEL - Smart Booking Form -->
                <div class="book-ride-form-panel">
                    <div class="glass card" style="padding: 24px;">
                        <h2 style="color: var(--rf-rider-primary); margin-bottom: 24px;">Book Your Ride</h2>

                        <!-- Islamabad Location Datalist -->
                        <datalist id="islamabad-locations">${locationOptions}${islamabadOptions}</datalist>

                        <!-- Step 1 - Location Input -->
                        <div class="booking-step">
                            <h3 style="color: var(--rf-text); margin-bottom: 16px;">📍 Where to?</h3>

                            <div class="location-inputs">
                                <div class="location-input-group">
                                    <label class="location-label">From</label>
                                    <div class="location-input-wrapper">
                                        <input type="text" id="pickup-input" class="form-control location-input"
                                               placeholder="Enter pickup location" autocomplete="off" list="islamabad-locations">
                                        <button class="location-btn" id="use-my-location" title="Use my location">
                                            📍
                                        </button>
                                    </div>
                                    <div id="pickup-suggestions" class="location-suggestions"></div>
                                </div>

                                <button class="swap-locations-btn" id="swap-locations" title="Swap locations">
                                    ↕
                                </button>

                                <div class="location-input-group">
                                    <label class="location-label">To</label>
                                    <div class="location-input-wrapper">
                                        <input type="text" id="dropoff-input" class="form-control location-input"
                                               placeholder="Enter destination" autocomplete="off" list="islamabad-locations">
                                    </div>
                                    <div id="dropoff-suggestions" class="location-suggestions"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2 - Vehicle Type Selector -->
                        <div class="booking-step">
                            <h3 style="color: var(--rf-text); margin: 24px 0 16px;">🚗 Choose Vehicle</h3>
                            <div class="vehicle-selector" id="vehicle-selector">
                                <div class="vehicle-card" data-type="bike">
                                    <div class="vehicle-icon">🏍️</div>
                                    <div class="vehicle-info">
                                        <div class="vehicle-name">Bike</div>
                                        <div class="vehicle-price">PKR 50-150</div>
                                        <div class="vehicle-wait">2-5 min</div>
                                    </div>
                                </div>
                                <div class="vehicle-card selected" data-type="economy">
                                    <div class="vehicle-icon">🚗</div>
                                    <div class="vehicle-info">
                                        <div class="vehicle-name">Economy</div>
                                        <div class="vehicle-price">PKR 150-400</div>
                                        <div class="vehicle-wait">3-8 min</div>
                                    </div>
                                </div>
                                <div class="vehicle-card" data-type="premium">
                                    <div class="vehicle-icon">💎</div>
                                    <div class="vehicle-info">
                                        <div class="vehicle-name">Premium</div>
                                        <div class="vehicle-price">PKR 400-800</div>
                                        <div class="vehicle-wait">5-12 min</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3 - Ride Options -->
                        <div class="booking-step">
                            <h3 style="color: var(--rf-text); margin: 24px 0 16px;">⚙️ Options</h3>

                            <div class="ride-options">
                                <div class="schedule-toggle">
                                    <label class="toggle-label">
                                        <input type="checkbox" id="schedule-toggle">
                                        <span class="toggle-slider"></span>
                                        Schedule for later
                                    </label>
                                    <input type="datetime-local" id="scheduled-time" class="form-control"
                                           style="display: none; margin-top: 8px;">
                                </div>

                                <div class="promo-input-group">
                                    <input type="text" id="promo-input" class="form-control"
                                           placeholder="Enter promo code">
                                    <button class="btn btn-secondary" id="apply-promo">Apply</button>
                                </div>
                                <div id="promo-message" class="promo-message" style="display: none;"></div>
                            </div>
                        </div>

                        <!-- Step 4 - Fare Breakdown -->
                        <div class="fare-breakdown-card glass" id="fare-breakdown" style="display: none;">
                            <h4 style="color: var(--rf-text); margin-bottom: 16px;">💰 Fare Breakdown</h4>

                            <div class="fare-row">
                                <span>Base fare</span>
                                <span id="base-fare">PKR 0</span>
                            </div>
                            <div class="fare-row">
                                <span>Distance (per km)</span>
                                <span id="distance-fare">PKR 0</span>
                            </div>
                            <div class="fare-row">
                                <span>Surge multiplier</span>
                                <span id="surge-multiplier">1.0x</span>
                            </div>
                            <div class="fare-row promo-row" id="promo-discount" style="display: none;">
                                <span id="promo-label">Promo discount</span>
                                <span id="promo-amount" style="color: var(--rf-success);">-PKR 0</span>
                            </div>

                            <hr style="border-color: var(--rf-border); margin: 12px 0;">

                            <div class="fare-row total-row">
                                <span style="font-weight: 600;">Total</span>
                                <span id="total-fare" style="font-size: 18px; font-weight: 700; color: var(--rf-rider-primary);">PKR 0</span>
                            </div>

                            <div class="payment-methods" style="margin-top: 16px;">
                                <label style="font-weight: 500; color: var(--rf-text);">Payment method:</label>
                                <div class="payment-pills">
                                    <button class="payment-pill active" data-method="cash">💵 Cash</button>
                                    <button class="payment-pill" data-method="wallet">👛 Wallet</button>
                                    <button class="payment-pill" data-method="card">💳 Card</button>
                                </div>
                            </div>
                        </div>

                        <!-- Find Driver CTA -->
                        <button class="btn find-driver-btn" id="find-driver-btn" disabled>
                            <span class="btn-text">Find Driver</span>
                            <div class="btn-loader" style="display: none;">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- RIGHT PANEL - Live Map -->
                <div class="book-ride-map-panel">
                    <div id="rider-map-container" style="height:350px; width:100%; border-radius:12px; margin-top:16px; border:1px solid #e5e7eb; overflow:hidden;"></div>

                    <div id="route-summary" style="display:none; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px 16px; margin-top:12px;">
                        <div style="display:flex; gap:24px; flex-wrap:wrap;">
                            <div><span style="font-size:12px;color:#6b7280;">Distance</span><br><strong id="route-distance">—</strong></div>
                            <div><span style="font-size:12px;color:#6b7280;">ETA</span><br><strong id="route-eta">—</strong></div>
                            <div><span style="font-size:12px;color:#6b7280;">Economy</span><br><strong id="route-fare-economy">—</strong></div>
                            <div><span style="font-size:12px;color:#6b7280;">Comfort</span><br><strong id="route-fare-comfort">—</strong></div>
                            <div><span style="font-size:12px;color:#6b7280;">Premium</span><br><strong id="route-fare-premium">—</strong></div>
                        </div>
                    </div>

                    <!-- Driver Arrival Indicator -->
                    <div id="driver-arrival-panel" style="display:none; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 16px; margin-top:12px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="font-size:24px;">🚗</div>
                            <div>
                                <div style="font-weight:600;" id="driver-arrival-text">Driver is on the way...</div>
                                <div style="font-size:12px; color:#6b7280;" id="driver-progress-text">0% away</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initBookRideForm();
        this.initBookingMap();

        // Expose validation on window for mapManager click handler
        var self = this;
        window.validateFindDriver = function () {
            self.validateFindDriver();
        };

        // Initial button state check
        this.validateFindDriver();
    }
    renderActiveRide(container) {
        if (!this.currentRide) {
            this.renderBookRide(container);
            return;
        }

        const driver = mockDrivers.find(d => d.id === this.currentRide.driver_id);
        const vehicle = driver ? mockVehicles.find(v => v.driver_id === driver.id) : null;

        container.innerHTML = `
            <div class="active-ride-layout">
                <!-- TOP GLASS OVERLAY -->
                <div class="active-ride-top-overlay glass">
                    <div class="driver-card glass">
                        <div class="driver-avatar">
                            <img src="${driver?.profile_image || 'https://via.placeholder.com/60x60?text=👤'}" alt="Driver">
                        </div>
                        <div class="driver-info">
                            <div class="driver-name">${driver?.full_name || 'Driver'}</div>
                            <div class="driver-rating">★ ${driver?.average_rating?.toFixed(1) || 'N/A'}</div>
                            <div class="vehicle-info">${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle info pending'}</div>
                            <div class="license-plate">${vehicle?.license_plate || 'ABC-123'}</div>
                        </div>
                    </div>

                    <div class="ride-status-display">
                        <div class="live-eta" id="live-eta">Calculating...</div>
                        <div class="status-pill" id="status-pill">
                            <div class="status-dot"></div>
                            <span id="status-text">${this.currentRide.status}</span>
                        </div>
                    </div>
                </div>

                <!-- FULL MAP -->
                <div id="rider-active-ride-map" style="height:350px; width:100%; border-radius:12px; margin-top:16px; border:1px solid #e5e7eb; overflow:hidden;"></div>

                <!-- BOTTOM FLOATING PANEL -->
                <div class="active-ride-bottom-panel glass">
                    <!-- Ride Status Stepper -->
                    <div class="ride-stepper">
                        <div class="stepper-line">
                            <div class="stepper-progress" id="stepper-progress"></div>
                        </div>
                        <div class="stepper-steps">
                            <div class="step completed" data-step="requested">
                                <div class="step-icon">📱</div>
                                <div class="step-label">Requested</div>
                            </div>
                            <div class="step ${this.currentRide.status !== 'Requested' ? 'completed' : ''}" data-step="accepted">
                                <div class="step-icon">✅</div>
                                <div class="step-label">Accepted</div>
                            </div>
                            <div class="step ${['Driver En Route', 'In Progress', 'Completed'].includes(this.currentRide.status) ? 'completed' : ''}" data-step="en-route">
                                <div class="step-icon">🚗</div>
                                <div class="step-label">En Route</div>
                            </div>
                            <div class="step ${['In Progress', 'Completed'].includes(this.currentRide.status) ? 'completed' : ''}" data-step="in-progress">
                                <div class="step-icon">🏁</div>
                                <div class="step-label">In Progress</div>
                            </div>
                            <div class="step ${this.currentRide.status === 'Completed' ? 'completed' : ''}" data-step="completed">
                                <div class="step-icon">🎉</div>
                                <div class="step-label">Completed</div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="ride-actions">
                        <button class="action-btn secondary" id="call-driver">
                            📞 Call Driver
                        </button>
                        <button class="action-btn secondary" id="message-driver">
                            💬 Message
                        </button>
                        <button class="action-btn danger" id="sos-btn">
                            🚨 SOS
                        </button>
                    </div>

                    <!-- Cancel Ride Link -->
                    <div class="cancel-ride-link">
                        <a href="#" id="cancel-ride-link" style="color: var(--rf-danger); text-decoration: none; font-size: 14px;">
                            Cancel Ride
                        </a>
                    </div>
                </div>
            </div>
        `;

        this.initActiveRide();
    }

    renderRideRequestForm(container) {
        container.innerHTML = `
            <form id="ride-request-form" style="display: flex; flex-direction: column; gap: 16px;">
                <div class="form-group required">
                    <label>Pickup Location</label>
                    <input type="text" name="pickup_location" class="form-control" placeholder="Enter pickup address" required>
                </div>
                <div class="form-group required">
                    <label>Drop-off Location</label>
                    <input type="text" name="dropoff_location" class="form-control" placeholder="Enter drop-off address" required>
                </div>
                <div class="promo-estimate-card" id="fare-estimate-card" style="display:none;">
                    <div>
                        <div class="promo-estimate-item"><span>Estimated fare</span><strong id="estimated-fare">PKR 0</strong></div>
                        <div class="promo-estimate-item"><span>Distance</span><strong id="estimated-distance">0 km</strong></div>
                        <div class="promo-estimate-item"><span>Duration</span><strong id="estimated-duration">0 min</strong></div>
                    </div>
                    <div>
                        <div class="promo-estimate-item"><span>Vehicle type</span><strong>Economy</strong></div>
                        <div class="promo-estimate-item"><span>Surge</span><strong>1.0x</strong></div>
                        <div class="promo-estimate-item"><span>Promo</span><strong id="promo-detail">None</strong></div>
                    </div>
                </div>
                <div id="driver-match-preview" class="card" style="display:none; margin-top: var(--space-lg);"></div>
                <div class="form-group">
                    <label>Schedule for later</label>
                    <input type="datetime-local" name="scheduled_time" class="form-control">
                </div>
                <div class="form-group">
                    <label>Promo Code</label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="text" name="promo_code" class="form-control" placeholder="Enter promo code">
                        <button type="button" class="btn btn-secondary" id="apply-promo">Apply</button>
                    </div>
                </div>
                <div id="promo-message" style="display:none; padding:12px; border-radius:4px;"></div>
                <button type="submit" class="btn btn-primary btn-block">Request Ride</button>
            </form>
        `;

        const form = document.getElementById('ride-request-form');
        const promoBtn = document.getElementById('apply-promo');
        const pickupInput = form.querySelector('input[name="pickup_location"]');
        const dropoffInput = form.querySelector('input[name="dropoff_location"]');
        const promoInput = form.querySelector('input[name="promo_code"]');

        const updateHandler = () => this.updateFareEstimate();
        pickupInput.addEventListener('input', updateHandler);
        dropoffInput.addEventListener('input', updateHandler);
        promoInput.addEventListener('input', updateHandler);

        promoBtn.addEventListener('click', () => this.validatePromo());
        form.addEventListener('submit', (e) => this.submitRideRequest(e));
    }

    // === SECTION 3: renderRideHistory() ===
    async renderRideHistory(container) {
        container.innerHTML = `
            <div class="ride-history-layout">
                <!-- Search and Filters -->
                <div class="history-controls glass">
                    <div class="search-bar">
                        <input type="text" id="history-search" class="form-control"
                               placeholder="Search by driver name, fare, or date..." style="flex: 1;">
                        <button class="btn btn-secondary" id="export-csv">📊 Export CSV</button>
                    </div>

                    <div class="filter-chips">
                        <button class="filter-chip active" data-filter="all">All</button>
                        <button class="filter-chip" data-filter="completed">Completed</button>
                        <button class="filter-chip" data-filter="cancelled">Cancelled</button>
                        <button class="filter-chip" data-filter="in-progress">In Progress</button>
                    </div>
                </div>

                <!-- Ride History List -->
                <div class="ride-history-list" id="ride-history-list">
                    <div class="loading-spinner" id="history-loading">
                        <div class="spinner"></div>
                        <span>Loading ride history...</span>
                    </div>
                </div>

                <!-- Pagination -->
                <div class="pagination-controls" id="pagination-controls" style="display: none;">
                    <button class="btn btn-outline" id="prev-page" disabled>← Previous</button>
                    <span id="page-info">Page 1 of 1</span>
                    <button class="btn btn-outline" id="next-page" disabled>Next →</button>
                </div>
            </div>
        `;

        this.initRideHistory();
    }

    // === SECTION 4: renderPayments() ===
    async renderPayments(container) {
        container.innerHTML = `
            <div class="payments-layout">
                <!-- Wallet Card -->
                <div class="wallet-card glass" style="background: linear-gradient(135deg, var(--rf-rider-primary), var(--rf-rider-light)); color: white;">
                    <div class="wallet-header">
                        <div class="wallet-icon">👛</div>
                        <div class="wallet-balance">
                            <div class="balance-label">Wallet Balance</div>
                            <div class="balance-amount">PKR 2,450</div>
                        </div>
                    </div>
                    <button class="btn btn-light" style="margin-top: 16px;">Add Money</button>
                </div>

                <!-- Transaction List -->
                <div class="transactions-section">
                    <h3 style="color: var(--rf-text); margin-bottom: 16px;">Recent Transactions</h3>
                    <div class="transactions-list" id="transactions-list">
                        <div class="transaction-item">
                            <div class="transaction-icon positive">💰</div>
                            <div class="transaction-info">
                                <div class="transaction-desc">Wallet Top-up</div>
                                <div class="transaction-date">2 hours ago</div>
                            </div>
                            <div class="transaction-amount positive">+PKR 500</div>
                        </div>
                        <div class="transaction-item">
                            <div class="transaction-icon negative">🚗</div>
                            <div class="transaction-info">
                                <div class="transaction-desc">Ride to Gulberg</div>
                                <div class="transaction-date">Yesterday</div>
                            </div>
                            <div class="transaction-amount negative">-PKR 320</div>
                        </div>
                        <div class="transaction-item">
                            <div class="transaction-icon positive">🎁</div>
                            <div class="transaction-info">
                                <div class="transaction-desc">Promo Credit</div>
                                <div class="transaction-date">3 days ago</div>
                            </div>
                            <div class="transaction-amount positive">+PKR 100</div>
                        </div>
                    </div>
                </div>

                <!-- Spending Analytics -->
                <div class="analytics-section">
                    <div class="analytics-grid">
                        <!-- Payment Method Pie Chart -->
                        <div class="analytics-card glass">
                            <h4 style="color: var(--rf-text); margin-bottom: 16px;">Spending by Method</h4>
                            <div class="pie-chart-container">
                                <div class="pie-chart" id="payment-pie-chart">
                                    <div class="pie-segment cash" style="--percentage: 60;"></div>
                                    <div class="pie-segment wallet" style="--percentage: 30;"></div>
                                    <div class="pie-segment card" style="--percentage: 10;"></div>
                                </div>
                                <div class="pie-legend">
                                    <div class="legend-item">
                                        <div class="legend-color cash"></div>
                                        <span>Cash (60%)</span>
                                    </div>
                                    <div class="legend-item">
                                        <div class="legend-color wallet"></div>
                                        <span>Wallet (30%)</span>
                                    </div>
                                    <div class="legend-item">
                                        <div class="legend-color card"></div>
                                        <span>Card (10%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Available Promos -->
                        <div class="analytics-card glass">
                            <h4 style="color: var(--rf-text); margin-bottom: 16px;">Available Promos</h4>
                            <div class="promo-grid">
                                <div class="promo-card">
                                    <div class="promo-header">
                                        <div class="promo-code">WELCOME10</div>
                                        <div class="promo-discount">10% OFF</div>
                                    </div>
                                    <div class="promo-desc">First ride discount</div>
                                    <div class="promo-timer" data-expires="2026-12-31">Expires in 182 days</div>
                                </div>
                                <div class="promo-card">
                                    <div class="promo-header">
                                        <div class="promo-code">RUSHHOUR</div>
                                        <div class="promo-discount">15% OFF</div>
                                    </div>
                                    <div class="promo-desc">Off-peak hours</div>
                                    <div class="promo-timer" data-expires="2026-12-31">Expires in 182 days</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initPayments();
    }

    // === SECTION 5: renderRatings() ===
    renderRatings(container) {
        const completedRides = (this.rideHistory || []).filter(ride =>
            ride.status === 'Completed'
        );
        const ratings = (mockRatings || []).filter(rating =>
            rating.rated_by === 'Rider' && completedRides.some(ride => ride.id === rating.ride_id)
        );
        const pendingRides = completedRides.filter(ride =>
            !ratings.some(rating => rating.ride_id === ride.id)
        );

        const averageRating = ratings.length ?
            (ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1) : null;

        container.innerHTML = `
            <div class="ratings-layout">
                <!-- Rating Stats -->
                <div class="rating-stats-card glass">
                    <div class="stats-header">
                        <div class="stats-avatar">
                            <img src="${this.currentUser.profile_image || 'https://via.placeholder.com/80x80?text=👤'}" alt="Profile">
                        </div>
                        <div class="stats-info">
                            <div class="stats-name">${this.currentUser.full_name}</div>
                            <div class="stats-rating">
                                <div class="rating-stars">
                                    ${this.generateStarRating(averageRating || 0)}
                                </div>
                                <span class="rating-score">${averageRating || 'No ratings yet'}</span>
                            </div>
                            <div class="stats-meta">
                                <span>${ratings.length} rides rated</span> •
                                <span>Member since ${new Date(this.currentUser.registration_date).getFullYear()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dual Rating Cards -->
                <div class="rating-cards-grid">
                    <!-- Rate Driver Card -->
                    <div class="rating-card glass">
                        <div class="rating-card-header">
                            <div class="rating-icon">🚗</div>
                            <h3>Rate Your Driver</h3>
                        </div>

                        ${pendingRides.length > 0 ? `
                            <div class="rating-form">
                                <div class="form-group">
                                    <label>Select completed ride:</label>
                                    <select id="rate-ride-select" class="form-control">
                                        <option value="">Choose a ride</option>
                                        ${pendingRides.map(ride => {
                                            const driver = mockUsers.find(u => u.id === ride.driver_id);
                                            return `<option value="${ride.id}">Ride #${ride.id} — ${driver?.full_name || 'Driver'}</option>`;
                                        }).join('')}
                                    </select>
                                </div>

                                <div class="star-rating-widget" id="driver-stars" style="display: none;">
                                    <label>Driver rating:</label>
                                    <div class="stars-container">
                                        ${[1,2,3,4,5].map(star => `
                                            <span class="star" data-rating="${star}">☆</span>
                                        `).join('')}
                                    </div>
                                </div>

                                <!-- FIX 5: Renamed class from "rating-comment" to "rating-comment-input"
                                     to avoid collision with the read-only ".rating-comment" divs rendered
                                     in the driver ratings history list below. initRatings() calls
                                     querySelector('.rating-comment') to show/hide the form textarea —
                                     without this fix it would also accidentally toggle the history items. -->
                                <div class="rating-comment-input" style="display: none;">
                                    <label>Comment (optional):</label>
                                    <textarea id="driver-comment" class="form-control" placeholder="Share feedback about your driver..." rows="3"></textarea>
                                </div>

                                <button class="btn btn-primary" id="submit-driver-rating" style="display: none;">
                                    Submit Rating
                                </button>
                            </div>
                        ` : `
                            <div class="no-ratings">
                                <div class="no-ratings-icon">✅</div>
                                <p>All your completed rides have been rated!</p>
                            </div>
                        `}
                    </div>

                    <!-- Driver Rated You Card -->
                    <div class="rating-card glass">
                        <div class="rating-card-header">
                            <div class="rating-icon">⭐</div>
                            <h3>How Drivers Rate You</h3>
                        </div>

                        <div class="driver-ratings-list">
                            ${ratings.length > 0 ? ratings.map(rating => {
                                const ride = mockRides.find(r => r.id === rating.ride_id);
                                const driver = mockUsers.find(u => u.id === ride?.driver_id);
                                return `
                                    <div class="driver-rating-item">
                                        <div class="driver-info">
                                            <div class="driver-name">${driver?.full_name || 'Driver'}</div>
                                            <div class="ride-date">${formatDateTime(rating.created_at)}</div>
                                        </div>
                                        <div class="rating-display">
                                            <div class="rating-stars">${this.generateStarRating(rating.score)}</div>
                                            ${rating.comment ? `<div class="rating-comment">"${rating.comment}"</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('') : `
                                <div class="no-ratings">
                                    <div class="no-ratings-icon">⏳</div>
                                    <p>No driver ratings yet</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Confetti Container (hidden by default) -->
                <div id="confetti-container" class="confetti-container" style="display: none;"></div>
            </div>
        `;

        this.initRatings();
    }

    renderRatingForm(pendingRides) {
        const container = document.getElementById('ratings-form-container');
        if (!pendingRides.length) {
            container.innerHTML = '<p class="text-muted">No completed rides are waiting for a driver rating.</p>';
            return;
        }

        container.innerHTML = `
            <form id="rating-form" style="display: flex; flex-direction: column; gap: 14px;">
                <div class="form-group required">
                    <label>Select completed ride</label>
                    <select name="ride_id" class="form-control" required>
                        <option value="">Choose a ride</option>
                        ${pendingRides.map(ride => {
                            const driverName = this.getRideDriverName(ride);
                            return `<option value="${ride.id}">Ride #${ride.id} — ${driverName}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="form-group required">
                    <label>Rating</label>
                    <select name="rating" class="form-control" required>
                        <option value="">Select score</option>
                        ${[5,4,3,2,1].map(score => `<option value="${score}">${score} ⭐</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Comment</label>
                    <textarea name="comment" class="form-control" placeholder="Share feedback for your driver"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Submit Rating</button>
            </form>
        `;

        document.getElementById('rating-form').addEventListener('submit', (e) => this.submitRating(e));
    }

    async submitRating(event) {
        event.preventDefault();
        const form = event.target;
        const data = Object.fromEntries(new FormData(form));

        if (!data.ride_id || !data.rating) {
            showToast('Please select a ride and rating score.', 'warning');
            return;
        }

        const ride = mockRides.find(item => item.id === Number(data.ride_id));
        if (!ride) {
            showToast('Selected ride could not be found.', 'error');
            return;
        }

        try {
            await riderAPI.rateRide(ride.id, {
                rated_by: 'Rider',
                rated_user_id: ride.driver_id,
                score: Number(data.rating),
                comment: data.comment || ''
            });
            showToast('Driver rating submitted successfully.', 'success');
            this.renderSection('ratings');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    renderComplaints(container) {
        const complaints = (mockComplaints || []).filter(c => c.filed_by === this.currentUser.id);
        const completedRides = (this.rideHistory || []).filter(ride => ride.status === 'Completed');
        const pendingRides = completedRides.filter(ride => !complaints.some(c => c.ride_id === ride.id));

        container.innerHTML = `
            <div class="grid-2" style="gap:20px;">
                <div class="card">
                    <div class="card-header"><h3>File a New Complaint</h3></div>
                    <div class="card-body">
                        <form id="complaint-form" style="display:flex; flex-direction:column; gap:16px;">
                            <div class="form-group required">
                                <label>Choose ride</label>
                                <select name="ride_id" class="form-control" required>
                                    <option value="">Select completed ride</option>
                                    ${pendingRides.map(ride => `<option value="${ride.id}">Ride #${ride.id} — ${this.getRideLocationLabel(ride, 'pickup')} → ${this.getRideLocationLabel(ride, 'dropoff')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group required">
                                <label>Complaint type</label>
                                <select name="complaint_type" class="form-control" required>
                                    <option value="">Choose issue type</option>
                                    <option value="Rude Behavior">Rude Behavior</option>
                                    <option value="Wrong Route">Wrong Route</option>
                                    <option value="Late Arrival">Late Arrival</option>
                                    <option value="Safety Concern">Safety Concern</option>
                                    <option value="Vehicle Condition">Vehicle Condition</option>
                                </select>
                            </div>
                            <div class="form-group required">
                                <label>Description</label>
                                <textarea name="description" class="form-control" rows="4" placeholder="Describe your issue" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Submit Complaint</button>
                        </form>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Complaint History</h3></div>
                    <div class="card-body" id="complaints-list"></div>
                </div>
            </div>
        `;

        document.getElementById('complaint-form').addEventListener('submit', (e) => this.submitComplaint(e));

        const listContainer = document.getElementById('complaints-list');
        if (!complaints.length) {
            listContainer.innerHTML = '<p class="text-muted">No complaints filed yet.</p>';
            return;
        }

        listContainer.innerHTML = complaints.map(item => `
            <div class="complaint-card">
                <div><strong>Issue #${item.id}</strong> — <span class="status-label status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></div>
                <div class="text-muted">${item.complaint_type}</div>
                <p>${item.description}</p>
                <div class="text-muted" style="font-size:12px;">Submitted ${formatDateTime(item.submitted_at)}</div>
            </div>
        `).join('');
    }

    async submitComplaint(event) {
        event.preventDefault();
        const form = event.target;
        const data = Object.fromEntries(new FormData(form));

        if (!data.ride_id || !data.complaint_type || !data.description) {
            showToast('Please complete all complaint fields.', 'warning');
            return;
        }

        try {
            await riderAPI.fileComplaint({
                rider_id: this.currentUser.id,
                ride_id: Number(data.ride_id),
                filed_by: this.currentUser.id,
                complaint_type: data.complaint_type,
                description: data.description,
                status: 'Open'
            });
            showToast('Complaint filed successfully.', 'success');
            this.renderSection('complaints');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // === SECTION 6: renderProfile() ===
    renderProfile(container) {
        container.innerHTML = `
            <div class="profile-layout">
                <!-- Profile Header -->
                <div class="profile-header-card glass">
                    <div class="profile-avatar-section">
                        <div class="avatar-upload">
                            <img id="profile-avatar" src="${this.currentUser.profile_image || 'https://via.placeholder.com/120x120?text=👤'}"
                                 alt="Profile Picture" class="profile-avatar">
                            <div class="avatar-overlay">
                                <label for="avatar-input" class="avatar-upload-btn">
                                    📷
                                </label>
                                <input type="file" id="avatar-input" accept="image/*" style="display: none;">
                            </div>
                        </div>
                        <div class="profile-basic-info">
                            <h2 class="profile-name">${this.currentUser.full_name}</h2>
                            <div class="profile-status">
                                <span class="status-badge ${this.currentUser.account_status.toLowerCase()}">
                                    ${this.currentUser.account_status}
                                </span>
                                <span class="member-since">
                                    Member since ${new Date(this.currentUser.registration_date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Editable Profile Form -->
                <div class="profile-form-card glass">
                    <h3 style="color: var(--rf-text); margin-bottom: 24px;">Personal Information</h3>

                    <div class="profile-form-grid">
                        <div class="form-group">
                            <label>Full Name</label>
                            <div class="editable-field">
                                <input type="text" id="edit-full-name" class="form-control"
                                       value="${this.currentUser.full_name}" readonly>
                                <button class="edit-btn" data-field="full-name">✏️</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Email</label>
                            <div class="editable-field">
                                <input type="email" id="edit-email" class="form-control"
                                       value="${this.currentUser.email}" readonly>
                                <button class="edit-btn" data-field="email">✏️</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Phone Number</label>
                            <div class="editable-field">
                                <input type="tel" id="edit-phone" class="form-control"
                                       value="${this.currentUser.phone_number}" readonly>
                                <button class="edit-btn" data-field="phone">✏️</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Date of Birth</label>
                            <div class="editable-field">
                                <input type="date" id="edit-dob" class="form-control"
                                       value="${this.currentUser.date_of_birth || ''}" readonly>
                                <button class="edit-btn" data-field="dob">✏️</button>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 24px; display: none;" id="profile-form-actions">
                        <button class="btn btn-secondary" id="cancel-profile-edit">Cancel</button>
                        <button class="btn btn-primary" id="save-profile-edit">Save Changes</button>
                    </div>
                </div>

                <!-- Saved Places -->
                <div class="saved-places-card glass">
                    <h3 style="color: var(--rf-text); margin-bottom: 24px;">Saved Places</h3>

                    <div class="saved-places-grid">
                        <div class="saved-place-card" data-place="home">
                            <div class="place-icon">🏠</div>
                            <div class="place-info">
                                <div class="place-name">Home</div>
                                <div class="place-address" id="home-address">
                                    ${this.currentUser.home_address || 'Not set'}
                                </div>
                            </div>
                            <button class="place-edit-btn" data-place="home">📍</button>
                        </div>

                        <div class="saved-place-card" data-place="work">
                            <div class="place-icon">🏢</div>
                            <div class="place-info">
                                <div class="place-name">Work</div>
                                <div class="place-address" id="work-address">
                                    ${this.currentUser.work_address || 'Not set'}
                                </div>
                            </div>
                            <button class="place-edit-btn" data-place="work">📍</button>
                        </div>

                        <div class="saved-place-card add-new" id="add-new-place">
                            <div class="place-icon">➕</div>
                            <div class="place-info">
                                <div class="place-name">Add Place</div>
                                <div class="place-address">Save a favorite location</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Emergency Contacts -->
                <div class="emergency-contacts-card glass">
                    <h3 style="color: var(--rf-text); margin-bottom: 24px;">Emergency Contacts</h3>

                    <div class="emergency-contacts-list" id="emergency-contacts-list">
                        <div class="emergency-contact-item">
                            <div class="contact-avatar">👨</div>
                            <div class="contact-info">
                                <div class="contact-name">Ahmad</div>
                                <div class="contact-relation">Brother</div>
                                <div class="contact-phone">+92 300 1234567</div>
                            </div>
                            <div class="contact-actions">
                                <button class="contact-action-btn">📞</button>
                                <button class="contact-action-btn">✏️</button>
                                <button class="contact-action-btn danger">🗑️</button>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-outline" id="add-emergency-contact" style="margin-top: 16px;">
                        ➕ Add Emergency Contact
                    </button>
                </div>

                <!-- Account Actions -->
                <div class="account-actions-card glass">
                    <h3 style="color: var(--rf-text); margin-bottom: 24px;">Account Settings</h3>

                    <div class="account-actions">
                        <button class="btn btn-outline danger" id="delete-account-btn">
                            🗑️ Delete Account
                        </button>
                        <p class="text-muted" style="font-size: 12px; margin-top: 8px;">
                            This action cannot be undone. All your data will be permanently deleted.
                        </p>
                    </div>
                </div>
            </div>
        `;

        this.initProfile();
    }

    renderSupport(container) {
        const recentRides = (this.rideHistory || []).filter(r => r.status === 'Completed');

        container.innerHTML = `
            <div class="support-layout" style="display:flex;flex-direction:column;gap:20px;">
                <!-- SOS Emergency -->
                <div class="card" style="border:2px solid #dc2626;background:#fef2f2;">
                    <div class="card-header" style="border-bottom-color:#fca5a5;"><h3 style="color:#dc2626;">🚨 SOS Emergency</h3></div>
                    <div class="card-body" style="text-align:center;padding:24px;">
                        <button class="btn" id="sos-btn" style="background:#dc2626;color:white;font-size:20px;padding:16px 40px;border-radius:12px;font-weight:700;">
                            SOS — Emergency Help
                        </button>
                        <p style="margin-top:12px;color:#991b1b;font-size:14px;">Tap only in a real emergency. This will display emergency contacts.</p>
                    </div>
                </div>

                <!-- Trip Sharing -->
                <div class="card">
                    <div class="card-header"><h3>📍 Share My Trip</h3></div>
                    <div class="card-body">
                        <p class="text-muted">Share your live trip with a trusted contact so they can track your ride.</p>
                        <button class="btn btn-primary" id="share-trip-btn">Share My Trip</button>
                        <div id="share-trip-link" style="display:none;margin-top:12px;">
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="text" id="trip-link-input" class="form-control" value="https://rideflow.app/track/RF-${Date.now().toString(36)}" readonly style="flex:1;">
                                <button class="btn btn-secondary" id="copy-trip-link">Copy</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Lost Item -->
                <div class="card">
                    <div class="card-header"><h3>🔍 Report Lost Item</h3></div>
                    <div class="card-body">
                        <form id="lost-item-form" style="display:flex;flex-direction:column;gap:14px;">
                            <div class="form-group">
                                <label>Select ride</label>
                                <select class="form-control" name="ride_id" required>
                                    <option value="">Choose a completed ride</option>
                                    ${recentRides.map(r => `<option value="${r.id}">Ride #${r.id} — ${this.getRideLocationLabel(r,'pickup')} → ${this.getRideLocationLabel(r,'dropoff')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Item description</label>
                                <textarea class="form-control" name="description" rows="3" placeholder="Describe the lost item (e.g., black wallet, phone charger)" required></textarea>
                            </div>
                            <div class="form-group">
                                <label>Contact number</label>
                                <input type="tel" class="form-control" name="contact" placeholder="+92 300 1234567" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Submit Report</button>
                        </form>
                    </div>
                </div>

                <!-- FAQ Accordion -->
                <div class="card">
                    <div class="card-header"><h3>❓ Frequently Asked Questions</h3></div>
                    <div class="card-body">
                        <div class="faq-accordion">
                            <div class="faq-item">
                                <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">How do I cancel a ride? <span class="faq-arrow">▸</span></button>
                                <div class="faq-answer"><p>You can cancel a ride from the active ride screen by tapping "Cancel Ride". Note: cancellations after 2 minutes may incur a small fee.</p></div>
                            </div>
                            <div class="faq-item">
                                <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">How is the fare calculated? <span class="faq-arrow">▸</span></button>
                                <div class="faq-answer"><p>Fare = Base fare + (Distance × Per-km rate) + (Time × Per-min rate). Surge pricing may apply during peak hours. Promo codes are applied on top.</p></div>
                            </div>
                            <div class="faq-item">
                                <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">What payment methods are accepted? <span class="faq-arrow">▸</span></button>
                                <div class="faq-answer"><p>We accept Cash, Wallet balance, and Credit/Debit cards. You can add a card in the Payments section.</p></div>
                            </div>
                            <div class="faq-item">
                                <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">How do I report a safety issue? <span class="faq-arrow">▸</span></button>
                                <div class="faq-answer"><p>Use the SOS button for emergencies, or file a complaint in the Complaints section for non-urgent issues. You can also share your trip live with a contact.</p></div>
                            </div>
                            <div class="faq-item">
                                <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">Can I schedule a ride in advance? <span class="faq-arrow">▸</span></button>
                                <div class="faq-answer"><p>Yes! Toggle "Schedule for later" in the booking form and pick your date and time. A driver will be assigned before your scheduled pickup.</p></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Live Chat -->
                <div class="card">
                    <div class="card-header"><h3>💬 Live Chat</h3></div>
                    <div class="card-body" style="text-align:center;">
                        <button class="btn btn-secondary" disabled style="opacity:0.6;cursor:not-allowed;">💬 Start Live Chat</button>
                        <p class="text-muted" style="margin-top:8px;font-size:13px;">Available 9am–9pm (Pakistan Standard Time)</p>
                    </div>
                </div>
            </div>
        `;

        this.initSupport();
    }

    initSupport() {
        // SOS button
        const sosBtn = document.getElementById('sos-btn');
        if (sosBtn) {
            sosBtn.addEventListener('click', () => {
                Modal.open({
                    title: '🚨 Emergency Contacts',
                    content: `
                        <div style="display:flex;flex-direction:column;gap:16px;">
                            <a href="tel:1122" class="btn btn-danger" style="text-align:center;">📞 Rescue 1122</a>
                            <a href="tel:15" class="btn btn-danger" style="text-align:center;">📞 Police 15</a>
                            <a href="tel:115" class="btn btn-danger" style="text-align:center;">📞 Edhi 115</a>
                        </div>
                    `,
                    size: 'small'
                });
            });
        }

        // Share trip
        const shareBtn = document.getElementById('share-trip-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                document.getElementById('share-trip-link').style.display = 'block';
                shareBtn.style.display = 'none';
            });
        }
        const copyBtn = document.getElementById('copy-trip-link');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const input = document.getElementById('trip-link-input');
                navigator.clipboard.writeText(input.value).then(() => {
                    showToast('Trip link copied to clipboard!', 'success');
                }).catch(() => {
                    input.select();
                    document.execCommand('copy');
                    showToast('Trip link copied!', 'success');
                });
            });
        }

        // Lost item form
        const lostForm = document.getElementById('lost-item-form');
        if (lostForm) {
            lostForm.addEventListener('submit', (e) => {
                e.preventDefault();
                showToast('Lost item report submitted. We will contact you shortly.', 'success');
                lostForm.reset();
            });
        }
    }

    async submitRideRequest(e) {
        e.preventDefault();

        const form = e.target;
        const data = Object.fromEntries(new FormData(form));

        if (!data.pickup_location || !data.dropoff_location) {
            showToast('Please enter both pickup and drop-off locations.', 'warning');
            return;
        }

        const pickupLoc = this.getLocationFromAddress(data.pickup_location);
        const dropoffLoc = this.getLocationFromAddress(data.dropoff_location);

        this.updateFareEstimate();

        try {
            showToast('Requesting ride...', 'info');
            
            // Prepare backend-compatible data with IDs
            const rideData = {
                rider_id: this.currentUser.id,
                pickup_location_id: pickupLoc?.id || 1,
                dropoff_location_id: dropoffLoc?.id || 2,
                ride_type: 'Regular',
                scheduled_time: data.scheduled_time || null,
                distance_km: this.fareEstimate?.distance_km || 5.0,
                estimated_fare: this.fareEstimate?.estimated_total || 500
            };

            const response = await riderAPI.requestRide(rideData);
            if (response.success) {
                this.currentRide = response.data;
                // Add lat/lng for tracking if missing
                if (!this.currentRide.pickup) {
                    this.currentRide.pickup = { 
                        lat: pickupLoc?.latitude || 33.6844, 
                        lng: pickupLoc?.longitude || 73.0479, 
                        address: data.pickup_location 
                    };
                    this.currentRide.dropoff = { 
                        lat: dropoffLoc?.latitude || 33.7297, 
                        lng: dropoffLoc?.longitude || 73.0745, 
                        address: data.dropoff_location 
                    };
                }
                showToast('Ride requested! Finding a driver...', 'success');
                setTimeout(() => this.render(), 800);
            }
        } catch (error) {
            console.error('[RideFlow] Ride request failed:', error);
            
            // Fallback to Local/Mock Mode if server is unreachable or returning validation errors
            const isNetworkError = error.message.toLowerCase().includes('failed to fetch') || 
                                 error.message.toLowerCase().includes('aborted') ||
                                 error.message.toLowerCase().includes('network');
            
            if (isNetworkError) {
                showToast('Server not responding. Switching to Local Demo Mode...', 'warning');
                
                // Simulate a successful request in local state
                const mockRideId = Math.floor(Math.random() * 10000);
                const mockRide = {
                    id: mockRideId,
                    rider_id: this.currentUser.id,
                    pickup: { lat: pickupLoc?.latitude || 33.6844, lng: pickupLoc?.longitude || 73.0479, address: data.pickup_location },
                    dropoff: { lat: dropoffLoc?.latitude || 33.7297, lng: dropoffLoc?.longitude || 73.0745, address: data.dropoff_location },
                    status: 'Requested',
                    fare: this.fareEstimate?.estimated_total || 450,
                    created_at: new Date().toISOString()
                };
                
                window.RideState.setRide(mockRide);
                this.currentRide = mockRide;
                
                setTimeout(() => {
                    showToast('Local demo ride started!', 'success');
                    this.render();
                    
                    // Simulate driver acceptance in 5 seconds
                    setTimeout(() => {
                        const current = window.RideState.getRide();
                        if (current && current.id === mockRideId && current.status === 'Requested') {
                            window.RideState.updateRide({ 
                                status: 'accepted',
                                driverDetails: { name: 'Maliketh', rating: '4.9', vehicle: 'Black Steed', plate: 'ELD-001' },
                                etaToPickup: 3
                            });
                        }
                    }, 5000);
                }, 1000);
            } else {
                showToast(error.message, 'error');
            }
        }
    }

    async validatePromo() {
        const promoInput = document.querySelector('input[name="promo_code"]');
        const promoMessage = document.getElementById('promo-message');
        const code = promoInput.value.trim();

        if (!code) {
            showToast('Please enter a promo code', 'warning');
            return;
        }

        try {
            const response = await promoAPI.validatePromoCode(code);
            const promo = response.data;
            this.promoCode = promo;
            promoMessage.style.display = 'block';
            promoMessage.className = 'badge badge-success';
            promoMessage.textContent = `✓ ${promo.code}: ${promo.discount_percent}% off`;
            showToast('Promo code applied!', 'success');
            this.updateFareEstimate();
        } catch (error) {
            this.promoCode = null;
            promoMessage.style.display = 'block';
            promoMessage.className = 'badge badge-danger';
            promoMessage.textContent = '✕ Invalid promo code';
            showToast('Invalid promo code', 'error');
            this.updateFareEstimate();
        }
    }

    getLocationFromAddress(query) {
        if (!query) return null;
        const lower = query.toLowerCase();
        return mockLocations.find(loc => loc.address.toLowerCase().includes(lower) || loc.city.toLowerCase().includes(lower));
    }

    updateFareEstimate() {
        const form = document.getElementById('ride-request-form');
        if (!form) return;

        const data = Object.fromEntries(new FormData(form));
        const pickup = this.getLocationFromAddress(data.pickup_location);
        const dropoff = this.getLocationFromAddress(data.dropoff_location);
        const promo = this.promoCode ? mockPromoCodes.find(code => code.code === this.promoCode.code) : null;
        const estimateCard = document.getElementById('fare-estimate-card');
        const promoDetail = document.getElementById('promo-detail');
        const estimatedFare = document.getElementById('estimated-fare');
        const estimatedDistance = document.getElementById('estimated-distance');
        const estimatedDuration = document.getElementById('estimated-duration');
        const driverMatchPreview = document.getElementById('driver-match-preview');

        if (!pickup || !dropoff) {
            if (estimateCard) estimateCard.style.display = 'none';
            if (driverMatchPreview) driverMatchPreview.style.display = 'none';
            return;
        }

        const route = routePlanner.buildRoute(
            { label: pickup.address, latitude: pickup.latitude, longitude: pickup.longitude },
            { label: dropoff.address, latitude: dropoff.latitude, longitude: dropoff.longitude }
        );

        const fare = routePlanner.estimateFare(route, 'Economy', promo);
        this.fareEstimate = fare;
        this.estimatedRoute = route;

        const driverMatch = routePlanner.suggestDriverForRequest({
            pickup_location: pickup.address,
            dropoff_location: dropoff.address
        });
        this.driverMatch = driverMatch;

        if (estimateCard) {
            estimateCard.style.display = 'grid';
            estimatedFare.textContent = formatCurrency(fare.estimated_total);
            estimatedDistance.textContent = `${route.distance_km.toFixed(1)} km`;
            estimatedDuration.textContent = `${route.duration_min} min`;
            promoDetail.textContent = promo ? `${promo.code} (${promo.discount_percent}%)` : 'None';
        }

        if (driverMatchPreview) {
            if (driverMatch) {
                const driverName = (mockUsers.find(u => u.id === driverMatch.driver.user_id) || {}).full_name || 'Driver';
                const score = driverMatch.score || 0;
                const proximityScore = driverMatch.proximityScore || Math.max(0, 100 - driverMatch.distance_to_pickup_km * 10);
                const ratingScore = driverMatch.ratingScore || (driverMatch.driver.average_rating / 5 * 100);
                const completionScore = driverMatch.completionScore || 85;
                driverMatchPreview.style.display = 'block';
                driverMatchPreview.innerHTML = `
                    <div class="card-header"><h3>🚗 Recommended Driver</h3></div>
                    <div class="card-body">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                            <div style="font-weight:700;font-size:16px;">${driverName}</div>
                            <span style="color:#f59e0b;">${driverMatch.driver.average_rating.toFixed(1)} ⭐</span>
                        </div>
                        <p>Vehicle: ${driverMatch.vehicle ? `${driverMatch.vehicle.make} ${driverMatch.vehicle.model}` : 'Not available'}</p>
                        <p>ETA to pickup: <strong>${driverMatch.pickup_eta_min} min</strong></p>
                        <p>Distance to you: <strong>${driverMatch.distance_to_pickup_km} km</strong></p>
                        <div style="margin-top:12px;padding:12px;background:var(--rf-bg, #f8fafc);border-radius:8px;">
                            <div style="font-weight:600;margin-bottom:8px;">Why this driver? (Score: ${score.toFixed(0)}/100)</div>
                            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                                <div style="display:flex;justify-content:space-between;"><span>📍 Proximity</span><span style="font-weight:600;">${proximityScore.toFixed(0)}/100</span></div>
                                <div style="background:#e2e8f0;border-radius:4px;height:6px;"><div style="background:var(--rf-rider-primary, #2563eb);height:6px;border-radius:4px;width:${proximityScore}%;"></div></div>
                                <div style="display:flex;justify-content:space-between;"><span>⭐ Rating</span><span style="font-weight:600;">${ratingScore.toFixed(0)}/100</span></div>
                                <div style="background:#e2e8f0;border-radius:4px;height:6px;"><div style="background:#f59e0b;height:6px;border-radius:4px;width:${ratingScore}%;"></div></div>
                                <div style="display:flex;justify-content:space-between;"><span>✅ Completion rate</span><span style="font-weight:600;">${completionScore.toFixed(0)}/100</span></div>
                                <div style="background:#e2e8f0;border-radius:4px;height:6px;"><div style="background:#16a34a;height:6px;border-radius:4px;width:${completionScore}%;"></div></div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                driverMatchPreview.style.display = 'block';
                driverMatchPreview.innerHTML = `
                    <div class="card-header"><h3>Recommended Driver</h3></div>
                    <div class="card-body">
                        <p class="text-muted">No nearby driver could be matched yet. Try again or request later.</p>
                    </div>
                `;
            }
        }
    }

    shareTrip() {
        const message = `RideFlow trip shared: ${window.location.href}`;
        navigator.clipboard?.writeText(message).then(() => {
            showToast('Trip share link copied to clipboard.', 'success');
        }).catch(() => {
            showToast('Trip share link is ready to share.', 'info');
        });
    }

    sendSOS() {
        Modal.confirm({
            title: 'Emergency SOS',
            message: 'This will alert emergency services and RideFlow support. Are you sure?',
            onConfirm: () => {
                showToast('Emergency alert sent! Help is on the way.', 'danger');
                // In real app, this would call emergency services
            }
        });
    }

    reportLostItem() {
        Modal.alert({
            title: 'Report Lost Item',
            message: `
                <form id="lost-item-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" name="description" placeholder="Describe the lost item" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Where was it last seen?</label>
                        <select class="form-control" name="location">
                            <option value="in_vehicle">In the vehicle</option>
                            <option value="at_pickup">At pickup location</option>
                            <option value="at_dropoff">At drop-off location</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Report</button>
                </form>
            `,
            onOpen: () => {
                document.getElementById('lost-item-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    showToast('Lost item report submitted. We\'ll help you recover it.', 'success');
                    Modal.close();
                });
            }
        });
    }

    toggleTripSharing() {
        if (!this.currentRide) return;
        this.currentRide.trip_shared = !this.currentRide.trip_shared;
        showToast(`Trip sharing ${this.currentRide.trip_shared ? 'enabled' : 'disabled'}.`, 'info');
        this.renderSection('overview');
    }

    cancelRideWithReason() {
        if (!this.currentRide) {
            showToast('No current ride to cancel.', 'warning');
            return;
        }

        const reason = window.prompt('Why are you cancelling this ride? Please provide a short reason.');
        if (!reason) {
            showToast('Cancellation reason is required.', 'warning');
            return;
        }

        riderAPI.cancelRide(this.currentRide.id)
            .then(() => {
                showToast('Ride cancelled successfully.', 'success');
                this.currentRide = null;
                this.renderSection('overview');
            })
            .catch(error => {
                showToast(error.message, 'error');
            });
    }

    showRideRoute() {
        if (!this.currentRide) {
            showToast('No current ride to display.', 'warning');
            return;
        }

        const route = routePlanner.createRouteFromRide(this.currentRide);
        const routeWithProgress = routePlanner.simulateLiveProgress(route, 8);

        Modal.alert({
            title: 'Trip Route',
            message: `<div id="ride-route-map" style="min-height:260px;"></div>`,
            onOpen: () => {
                const modalMap = new RouteMap('ride-route-map');
                modalMap.render(routeWithProgress);
            }
        });
    }

    openRideDetails(ride) {
        const route = routePlanner.createRouteFromRide(ride);
        const routeSnapshot = routePlanner.advanceRouteProgress(route, 0);

        Modal.alert({
            title: `Ride #${ride.id}`,
            message: `
                <div style="text-align:left; font-size:14px; line-height:1.6;">
                    <p><strong>Pickup:</strong> ${ride.pickup_location}</p>
                    <p><strong>Drop-off:</strong> ${ride.dropoff_location}</p>
                    <p><strong>Status:</strong> ${ride.status}</p>
                    <p><strong>Fare:</strong> ${formatCurrency(ride.fare || 0)}</p>
                    <p><strong>Date:</strong> ${formatDateTime(ride.created_at)}</p>
                    <p><strong>Route distance:</strong> ${route.distance_km.toFixed(1)} km</p>
                    <p><strong>Estimated duration:</strong> ${route.duration_min} min</p>
                </div>
                <div id="ride-details-map" style="min-height:260px; margin-top:16px;"></div>
            `,
            onOpen: () => {
                const modalMap = new RouteMap('ride-details-map');
                modalMap.render(routeSnapshot);
            }
        });
    }

    // Premium Features
    loadScheduledRides() {
        return (mockScheduledRides || [
            {
                id: 'sched-1',
                pickup: mockLocations[0],
                dropoff: mockLocations[1],
                scheduled_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                vehicle_type: 'Economy',
                status: 'scheduled',
                estimated_fare: 450
            }
        ]);
    }

    loadPromoCodes() {
        return (mockPromoCodes || [
            { code: 'WELCOME10', discount_percent: 10, description: 'Welcome discount', valid_until: '2026-12-31' },
            { code: 'RUSHHOUR', discount_percent: 15, description: 'Off-peak discount', valid_until: '2026-12-31' }
        ]);
    }

    scheduleRide() {
        const scheduledTime = prompt('Enter scheduled time (YYYY-MM-DD HH:MM):', new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
        if (scheduledTime) {
            showToast('Ride scheduled successfully!', 'success');
        }
    }

    copyPromoCode(code) {
        navigator.clipboard?.writeText(code).then(() => {
            showToast(`Promo code ${code} copied!`, 'success');
        });
    }

    rebookRide(rideId) {
        showToast('Rebooking this ride...', 'info');
    }

    rateRide(rideId) {
        Modal.alert({
            title: 'Rate Your Ride',
            message: `
                <form id="rating-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="form-group">
                        <label>Rating</label>
                        <div class="rating-stars">
                            ⭐⭐⭐⭐⭐
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Review (Optional)</label>
                        <textarea class="form-control" name="review" placeholder="Tell us about your experience"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Rating</button>
                </form>
            `,
            onOpen: () => {
                document.getElementById('rating-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    showToast('Thank you for your feedback!', 'success');
                    Modal.close();
                });
            }
        });
    }

    reportIssue(rideId) {
        Modal.alert({
            title: 'Report Issue',
            message: `
                <form id="issue-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="form-group">
                        <label>Issue Type</label>
                        <select class="form-control" name="issue_type">
                            <option value="driver_behavior">Driver Behavior</option>
                            <option value="vehicle_issue">Vehicle Issue</option>
                            <option value="route_issue">Route Issue</option>
                            <option value="billing">Billing Problem</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" name="description" placeholder="Describe the issue" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Report</button>
                </form>
            `,
            onOpen: () => {
                document.getElementById('issue-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    showToast('Issue reported. Our team will investigate.', 'success');
                    Modal.close();
                });
            }
        });
    }

    showSafetyTips() {
        Modal.alert({
            title: 'Safety Tips',
            message: `
                <div class="safety-tips">
                    <h4>🛡️ Ride Safety Tips</h4>
                    <ul>
                        <li>Share your trip details with trusted contacts</li>
                        <li>Verify your driver's identity and vehicle</li>
                        <li>Sit in the back seat for safety</li>
                        <li>Trust your instincts - cancel if uncomfortable</li>
                        <li>Keep emergency contacts handy</li>
                    </ul>
                </div>
            `
        });
    }

    // === NEW METHODS FOR ENHANCED DASHBOARD ===

    // Active Ride Methods
    initActiveRide() {
        var self = this;

        // Initialize live map for active ride
        setTimeout(function () {
            if (!window.RideFlowMap) return;

            RideFlowMap.destroyMap();
            RideFlowMap.initRiderMap('rider-active-ride-map');

            // Start live GPS tracking
            RideFlowMap.startLiveTracking(function (lat, lng) {
                // Rider's position updated automatically
            });

            // Set pickup and dropoff markers from current ride
            if (self.currentRide) {
                var pickupLoc = self._resolveRideLocation(self.currentRide, 'pickup');
                var dropoffLoc = self._resolveRideLocation(self.currentRide, 'dropoff');
                if (pickupLoc) RideFlowMap.setPickupMarker(pickupLoc.lat, pickupLoc.lng, pickupLoc.label || 'Pickup');
                if (dropoffLoc) RideFlowMap.setDropoffMarker(dropoffLoc.lat, dropoffLoc.lng, dropoffLoc.label || 'Destination');
                if (pickupLoc && dropoffLoc) {
                    RideFlowMap.drawRoute(pickupLoc.lat, pickupLoc.lng, dropoffLoc.lat, dropoffLoc.lng, function (result) {
                        var etaEl = document.getElementById('live-eta');
                        if (etaEl) etaEl.textContent = result.duration + ' min';
                    });
                }
            }
        }, 150);

        // Update ETA every second
        this.startETAUpdates();

        // Setup action buttons
        this.setupActiveRideActions();
    }

    _resolveRideLocation(ride, type) {
        var locData = ride[type + '_location'] || ride[type + '_location_id'];
        if (locData && locData.latitude) {
            return { lat: locData.latitude, lng: locData.longitude, label: locData.address || locData.name };
        }
        // Try to find in RideFlowLocations by name
        var name = ride[type + '_location'] || '';
        if (window.RideFlowLocations && RideFlowLocations[name]) {
            return { lat: RideFlowLocations[name].lat, lng: RideFlowLocations[name].lng, label: name };
        }
        // Default Islamabad center
        if (type === 'pickup') return { lat: 33.6844, lng: 73.0479, label: 'G-9 Markaz' };
        return { lat: 33.7238, lng: 73.0879, label: 'Blue Area' };
    }

    startETAUpdates() {
        const updateETA = () => {
            if (!this.currentRide) return;

            // Mock ETA calculation
            const eta = Math.max(1, Math.floor(Math.random() * 15) + 1);
            document.getElementById('live-eta').textContent = `${eta} min`;

            // Update stepper progress
            this.updateRideStepper();
        };

        updateETA();
        this.etaInterval = setInterval(updateETA, 1000);
    }

    updateRideStepper() {
        const progress = this.calculateRideProgress();
        const stepperProgress = document.getElementById('stepper-progress');

        if (stepperProgress) {
            stepperProgress.style.width = `${progress}%`;
        }
    }

    calculateRideProgress() {
        if (!this.currentRide) return 0;

        const statusOrder = ['Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed'];
        const currentIndex = statusOrder.indexOf(this.currentRide.status);
        return ((currentIndex + 1) / statusOrder.length) * 100;
    }

    setupActiveRideActions() {
        // Call driver
        document.getElementById('call-driver')?.addEventListener('click', () => {
            showToast('Calling driver...', 'info');
        });

        // Message driver
        document.getElementById('message-driver')?.addEventListener('click', () => {
            Modal.alert({
                title: 'Message Driver',
                message: `
                    <div class="message-form">
                        <textarea class="form-control" placeholder="Type your message..." rows="3"></textarea>
                        <button class="btn btn-primary" style="margin-top: 12px;">Send Message</button>
                    </div>
                `
            });
        });

        // SOS button
        document.getElementById('sos-btn')?.addEventListener('click', () => {
            this.showSOSModal();
        });

        // Cancel ride
        document.getElementById('cancel-ride-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCancelRideModal();
        });
    }

    showSOSModal() {
        Modal.alert({
            title: '🚨 Emergency SOS',
            message: `
                <div class="sos-options">
                    <button class="btn btn-danger sos-option" data-action="location">
                        📍 Share Live Location
                    </button>
                    <button class="btn btn-danger sos-option" data-action="police">
                        🚔 Contact Police
                    </button>
                    <button class="btn btn-danger sos-option" data-action="cancel">
                        🚫 Cancel Ride
                    </button>
                </div>
                <p style="text-align: center; margin-top: 16px; color: var(--rf-danger);">
                    Emergency services will be notified immediately.
                </p>
            `,
            onOpen: () => {
                document.querySelectorAll('.sos-option').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const action = e.target.dataset.action;
                        this.handleSOSAction(action);
                        Modal.close();
                    });
                });
            }
        });
    }

    handleSOSAction(action) {
        switch (action) {
            case 'location':
                showToast('Live location shared with emergency contacts!', 'success');
                break;
            case 'police':
                showToast('Contacting emergency services...', 'danger');
                break;
            case 'cancel':
                this.cancelRideWithReason();
                break;
        }
    }

    showCancelRideModal() {
        Modal.confirm({
            title: 'Cancel Ride',
            message: `
                <div style="text-align: left;">
                    <p>Why are you cancelling this ride?</p>
                    <select id="cancel-reason" class="form-control" style="margin: 12px 0;">
                        <option value="">Select a reason</option>
                        <option value="changed-mind">Changed my mind</option>
                        <option value="wrong-location">Wrong pickup location</option>
                        <option value="driver-delay">Driver taking too long</option>
                        <option value="emergency">Emergency situation</option>
                        <option value="other">Other</option>
                    </select>
                    <textarea id="cancel-note" class="form-control" placeholder="Additional notes (optional)" rows="3"></textarea>
                </div>
            `,
            onConfirm: () => {
                const reason = document.getElementById('cancel-reason').value;
                if (!reason) {
                    showToast('Please select a cancellation reason.', 'warning');
                    return false;
                }
                this.cancelRideWithReason(reason);
            }
        });
    }

    // Ride History Methods
    initRideHistory() {
        this.loadRideHistory();
        this.setupHistoryFilters();
        this.setupHistorySearch();
        this.setupExportCSV();
    }

    async loadRideHistory() {
        const loadingEl = document.getElementById('history-loading');
        const listEl = document.getElementById('ride-history-list');

        loadingEl.style.display = 'flex';

        try {
            // Mock ride history data
            const mockHistory = [
                {
                    id: 'R001',
                    date: '2024-01-15',
                    pickup: 'Gulberg, Lahore',
                    dropoff: 'Johar Town, Lahore',
                    fare: 320,
                    status: 'completed',
                    driver: 'Ahmed Khan',
                    rating: 5,
                    vehicle: 'Toyota Corolla'
                },
                {
                    id: 'R002',
                    date: '2024-01-14',
                    pickup: 'Model Town, Lahore',
                    dropoff: 'DHA Phase 6, Lahore',
                    fare: 450,
                    status: 'completed',
                    driver: 'Sara Ahmed',
                    rating: 4,
                    vehicle: 'Honda City'
                },
                {
                    id: 'R003',
                    date: '2024-01-13',
                    pickup: 'Wapda Town, Lahore',
                    dropoff: 'Mall Road, Lahore',
                    fare: 280,
                    status: 'cancelled',
                    driver: null,
                    rating: null,
                    vehicle: null
                }
            ];

            this.rideHistory = mockHistory;
            this.filteredHistory = [...mockHistory];
            this.renderRideHistoryList();

        } catch (error) {
            listEl.innerHTML = '<p class="error">Failed to load ride history.</p>';
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    renderRideHistoryList() {
        const listEl = document.getElementById('ride-history-list');
        const itemsPerPage = 10;
        const startIndex = (this.currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const visibleItems = this.filteredHistory.slice(startIndex, endIndex);

        listEl.innerHTML = visibleItems.map(ride => `
            <div class="ride-history-item ${ride.status}" data-ride-id="${ride.id}">
                <div class="ride-header">
                    <div class="ride-id">Ride #${ride.id}</div>
                    <div class="ride-date">${new Date(ride.date).toLocaleDateString()}</div>
                    <div class="ride-status status-${ride.status}">${ride.status}</div>
                </div>
                <div class="ride-route">
                    <div class="route-point">
                        <span class="route-icon">📍</span>
                        <span class="route-text">${ride.pickup}</span>
                    </div>
                    <div class="route-arrow">→</div>
                    <div class="route-point">
                        <span class="route-icon">🏁</span>
                        <span class="route-text">${ride.dropoff}</span>
                    </div>
                </div>
                <div class="ride-details">
                    <div class="ride-fare">PKR ${ride.fare}</div>
                    ${ride.driver ? `<div class="ride-driver">🚗 ${ride.driver}</div>` : ''}
                    ${ride.rating ? `<div class="ride-rating">${'⭐'.repeat(ride.rating)}</div>` : ''}
                </div>
                <div class="ride-actions">
                    <button class="btn btn-sm btn-outline expand-btn" data-ride-id="${ride.id}">
                        ${this.expandedRide === ride.id ? 'Collapse' : 'Details'}
                    </button>
                    ${ride.status === 'completed' ? `
                        <button class="btn btn-sm btn-primary rebook-btn" data-ride-id="${ride.id}">
                            Re-book
                        </button>
                    ` : ''}
                </div>
                <div class="ride-expanded" id="expanded-${ride.id}" style="display: ${this.expandedRide === ride.id ? 'block' : 'none'};">
                    <div class="expanded-content">
                        <div class="mini-map" id="mini-map-${ride.id}" style="height: 150px; border-radius: 8px; margin: 12px 0;"></div>
                        <div class="expanded-details">
                            <div class="detail-row">
                                <span>Vehicle:</span>
                                <span>${ride.vehicle || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span>Duration:</span>
                                <span>15 min</span>
                            </div>
                            <div class="detail-row">
                                <span>Distance:</span>
                                <span>8.5 km</span>
                            </div>
                            <div class="detail-row">
                                <span>Payment:</span>
                                <span>Cash</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.updatePagination();
        this.setupHistoryItemActions();
    }

    setupHistoryFilters() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const filter = chip.dataset.filter;
                this.applyHistoryFilter(filter);
            });
        });
    }

    setupHistorySearch() {
        const searchInput = document.getElementById('history-search');
        let searchTimeout;

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.applyHistorySearch(searchInput.value);
            }, 300);
        });
    }

    applyHistoryFilter(status) {
        if (status === 'all') {
            this.filteredHistory = [...this.rideHistory];
        } else {
            this.filteredHistory = this.rideHistory.filter(ride => ride.status === status);
        }
        this.currentPage = 1;
        this.renderRideHistoryList();
    }

    applyHistorySearch(query) {
        if (!query.trim()) {
            this.filteredHistory = [...this.rideHistory];
        } else {
            const lowerQuery = query.toLowerCase();
            this.filteredHistory = this.rideHistory.filter(ride =>
                ride.id.toLowerCase().includes(lowerQuery) ||
                ride.pickup.toLowerCase().includes(lowerQuery) ||
                ride.dropoff.toLowerCase().includes(lowerQuery) ||
                (ride.driver && ride.driver.toLowerCase().includes(lowerQuery))
            );
        }
        this.currentPage = 1;
        this.renderRideHistoryList();
    }

    setupHistoryItemActions() {
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rideId = e.target.dataset.rideId;
                this.toggleRideExpansion(rideId);
            });
        });

        document.querySelectorAll('.rebook-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rideId = e.target.dataset.rideId;
                this.rebookRide(rideId);
            });
        });
    }

    toggleRideExpansion(rideId) {
        const expandedEl = document.getElementById(`expanded-${rideId}`);

        if (this.expandedRide === rideId) {
            expandedEl.style.display = 'none';
            this.expandedRide = null;
        } else {
            // Hide previously expanded
            if (this.expandedRide) {
                document.getElementById(`expanded-${this.expandedRide}`).style.display = 'none';
            }

            expandedEl.style.display = 'block';
            this.expandedRide = rideId;

            // Initialize mini map
            setTimeout(() => {
                const miniMapEl = document.getElementById(`mini-map-${rideId}`);
                if (miniMapEl && !miniMapEl.hasChildNodes()) {
                    // Mock mini map - in real app would use actual map
                    miniMapEl.innerHTML = '<div style="background: var(--rf-bg); height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 8px;">🗺️ Route Map</div>';
                }
            }, 100);
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredHistory.length / 10);
        const paginationEl = document.getElementById('pagination-controls');
        const pageInfoEl = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (totalPages <= 1) {
            paginationEl.style.display = 'none';
            return;
        }

        paginationEl.style.display = 'flex';
        pageInfoEl.textContent = `Page ${this.currentPage} of ${totalPages}`;
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;

        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderRideHistoryList();
            }
        };

        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderRideHistoryList();
            }
        };
    }

    setupExportCSV() {
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportRideHistoryCSV();
        });
    }

    exportRideHistoryCSV() {
        const headers = ['Ride ID', 'Date', 'Pickup', 'Dropoff', 'Fare', 'Status', 'Driver', 'Rating'];
        const csvContent = [
            headers.join(','),
            ...this.filteredHistory.map(ride => [
                ride.id,
                ride.date,
                `"${ride.pickup}"`,
                `"${ride.dropoff}"`,
                ride.fare,
                ride.status,
                ride.driver || '',
                ride.rating || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ride-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Ride history exported successfully!', 'success');
    }

    // Payments Methods
    initPayments() {
        this.initPromoTimers();
    }

    initPromoTimers() {
        document.querySelectorAll('.promo-timer').forEach(timer => {
            const expiresAt = new Date(timer.dataset.expires);
            const updateTimer = () => {
                const now = new Date();
                const diff = expiresAt - now;

                if (diff <= 0) {
                    timer.textContent = 'Expired';
                    timer.style.color = 'var(--rf-danger)';
                    return;
                }

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                timer.textContent = `Expires in ${days} days`;
            };

            updateTimer();
            setInterval(updateTimer, 60000); // Update every minute
        });
    }

    // Ratings Methods
    initRatings() {
        this.setupStarRating();
        this.setupRatingSubmission();
    }

    setupStarRating() {
        const rideSelect = document.getElementById('rate-ride-select');
        const starsWidget = document.getElementById('driver-stars');

        // FIX 5 (cont.): Updated selector to match the renamed class "rating-comment-input"
        const commentSection = document.querySelector('.rating-comment-input');
        const submitBtn = document.getElementById('submit-driver-rating');

        rideSelect.addEventListener('change', () => {
            if (rideSelect.value) {
                starsWidget.style.display = 'block';
                commentSection.style.display = 'block';
                submitBtn.style.display = 'block';
            } else {
                starsWidget.style.display = 'none';
                commentSection.style.display = 'none';
                submitBtn.style.display = 'none';
            }
        });

        // Star rating interaction
        document.querySelectorAll('.star').forEach((star, index) => {
            star.addEventListener('click', () => {
                this.selectedRating = index + 1;
                this.updateStarDisplay();
            });

            star.addEventListener('mouseover', () => {
                this.updateStarDisplay(index + 1, true);
            });

            star.addEventListener('mouseout', () => {
                this.updateStarDisplay(this.selectedRating || 0, false);
            });
        });
    }

    updateStarDisplay(rating = 0, isHover = false) {
        document.querySelectorAll('.star').forEach((star, index) => {
            if (index < rating) {
                star.textContent = '⭐';
            } else {
                star.textContent = '☆';
            }
        });
    }

    setupRatingSubmission() {
        document.getElementById('submit-driver-rating').addEventListener('click', () => {
            const rideId = document.getElementById('rate-ride-select').value;
            const comment = document.getElementById('driver-comment').value;

            if (!rideId || !this.selectedRating) {
                showToast('Please select a ride and rating.', 'warning');
                return;
            }

            // Submit rating
            this.submitDriverRating(rideId, this.selectedRating, comment);
        });
    }

    async submitDriverRating(rideId, rating, comment) {
        try {
            // Mock API call
            const ratingData = {
                ride_id: rideId,
                score: rating,
                comment: comment,
                created_at: new Date().toISOString()
            };

            if (!mockRatings) mockRatings = [];
            mockRatings.push(ratingData);

            // Show confetti animation
            this.showConfetti();

            showToast('Thank you for your feedback!', 'success');

            // Reset form
            document.getElementById('rate-ride-select').value = '';
            document.getElementById('driver-comment').value = '';
            this.selectedRating = 0;
            this.updateStarDisplay();

            // Refresh ratings section
            setTimeout(() => {
                this.renderSection('ratings');
            }, 2000);

        } catch (error) {
            showToast('Failed to submit rating. Please try again.', 'error');
        }
    }

    showConfetti() {
        const confettiContainer = document.getElementById('confetti-container');
        confettiContainer.style.display = 'block';

        // Create confetti pieces
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = ['var(--rf-rider-primary)', 'var(--rf-accent)', 'var(--rf-success)', 'var(--rf-warning)'][Math.floor(Math.random() * 4)];
            confettiContainer.appendChild(confetti);
        }

        // Hide after animation
        setTimeout(() => {
            confettiContainer.style.display = 'none';
            confettiContainer.innerHTML = '';
        }, 4000);
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return '⭐'.repeat(fullStars) +
               (hasHalfStar ? '⭐' : '') +
               '☆'.repeat(emptyStars);
    }

    // Profile Methods
    initProfile() {
        this.setupProfileEditing();
        this.setupAvatarUpload();
        this.setupSavedPlaces();
        this.setupEmergencyContacts();
        this.setupAccountDeletion();
    }

    setupProfileEditing() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const field = e.target.dataset.field;
                this.toggleFieldEditing(field);
            });
        });

        document.getElementById('cancel-profile-edit').addEventListener('click', () => {
            this.cancelProfileEditing();
        });

        document.getElementById('save-profile-edit').addEventListener('click', () => {
            this.saveProfileChanges();
        });
    }

    toggleFieldEditing(field) {
        const input = document.getElementById(`edit-${field}`);
        const actions = document.getElementById('profile-form-actions');

        if (input.readOnly) {
            input.readOnly = false;
            input.focus();
            input.style.borderColor = 'var(--rf-rider-primary)';
            actions.style.display = 'flex';
        } else {
            input.readOnly = true;
            input.style.borderColor = 'var(--rf-border)';
        }
    }

    cancelProfileEditing() {
        document.querySelectorAll('input[id^="edit-"]').forEach(input => {
            input.readOnly = true;
            input.style.borderColor = 'var(--rf-border)';
        });
        document.getElementById('profile-form-actions').style.display = 'none';
    }

    saveProfileChanges() {
        // Mock save
        showToast('Profile updated successfully!', 'success');
        this.cancelProfileEditing();
    }

    setupAvatarUpload() {
        const avatarInput = document.getElementById('avatar-input');
        const avatarImg = document.getElementById('profile-avatar');

        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarImg.src = e.target.result;
                    showToast('Avatar updated!', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    setupSavedPlaces() {
        document.querySelectorAll('.place-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const place = e.target.dataset.place;
                this.editSavedPlace(place);
            });
        });

        document.getElementById('add-new-place').addEventListener('click', () => {
            this.addNewPlace();
        });
    }

    editSavedPlace(place) {
        const address = prompt(`Enter new ${place} address:`);
        if (address) {
            document.getElementById(`${place}-address`).textContent = address;
            showToast(`${place.charAt(0).toUpperCase() + place.slice(1)} updated!`, 'success');
        }
    }

    addNewPlace() {
        const name = prompt('Enter place name (e.g., Office, Gym):');
        const address = prompt('Enter address:');

        if (name && address) {
            showToast('New place added!', 'success');
            // In real app, would add to saved places list
        }
    }

    setupEmergencyContacts() {
        document.getElementById('add-emergency-contact').addEventListener('click', () => {
            this.addEmergencyContact();
        });
    }

    addEmergencyContact() {
        Modal.alert({
            title: 'Add Emergency Contact',
            message: `
                <form id="emergency-contact-form" style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Relationship</label>
                        <input type="text" class="form-control" name="relation" required>
                    </div>
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" class="form-control" name="phone" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Contact</button>
                </form>
            `,
            onOpen: () => {
                document.getElementById('emergency-contact-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    showToast('Emergency contact added!', 'success');
                    Modal.close();
                });
            }
        });
    }

    setupAccountDeletion() {
        document.getElementById('delete-account-btn').addEventListener('click', () => {
            Modal.confirm({
                title: 'Delete Account',
                message: 'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
                confirmText: 'Yes, Delete My Account',
                onConfirm: () => {
                    showToast('Account deletion request submitted. You will receive a confirmation email.', 'warning');
                }
            });
        });
    }

    // ── Live Map: Booking Map ─────────────────────────────────────
    initBookingMap() {
        var self = this;
        this._pickupSet = false;
        this._dropoffSet = false;
        this._selectedRideType = 'economy';

        // Show loading state in pickup field
        var pickupInput = document.getElementById('pickup-input');
        if (pickupInput) {
            pickupInput.value = 'Detecting location...';
            pickupInput.style.color = '#9ca3af';
        }

        setTimeout(function () {
            if (!window.RideFlowMap) return;

            RideFlowMap.destroyMap();
            RideFlowMap.initRiderMap('rider-map-container');

            // Start live GPS tracking
            RideFlowMap.startLiveTracking(function (lat, lng) {
                if (!self._pickupSet) {
                    RideFlowMap.setPickupMarker(lat, lng, 'Your location');
                    if (pickupInput) {
                        pickupInput.value = 'Current Location';
                        pickupInput.style.color = '';
                    }
                    self._pickupSet = true;
                    self.validateFindDriver();
                }
            });

            // If GPS fails or is denied, clear the loading state so user can type manually
            setTimeout(function () {
                if (!self._pickupSet && pickupInput) {
                    pickupInput.value = '';
                    pickupInput.style.color = '';
                    pickupInput.placeholder = 'Enter pickup location';
                    self.validateFindDriver();
                }
            }, 8000);
        }, 150);
    }

    // ── Live Map: Booking Form Logic ──────────────────────────────
    initBookRideForm() {
        var self = this;

        // Use My Location button
        var useMyLocBtn = document.getElementById('use-my-location');
        if (useMyLocBtn) {
            useMyLocBtn.addEventListener('click', function () {
                if (!navigator.geolocation) {
                    showToast('Geolocation not supported', 'error');
                    return;
                }
                navigator.geolocation.getCurrentPosition(function (pos) {
                    var lat = pos.coords.latitude;
                    var lng = pos.coords.longitude;
                    if (window.RideFlowMap) {
                        RideFlowMap.setPickupMarker(lat, lng, 'Your location');
                        RideFlowMap.map.setView([lat, lng], 14);
                    }
                    document.getElementById('pickup-input').value = 'Current Location';
                    self._pickupSet = true;
                    self._tryDrawRoute();
                    self.validateFindDriver();
                }, function () {
                    showToast('Could not get your location', 'error');
                }, { enableHighAccuracy: true, timeout: 10000 });
            });
        }

        // Swap locations button
        var swapBtn = document.getElementById('swap-locations');
        if (swapBtn) {
            swapBtn.addEventListener('click', function () {
                var pickupInput = document.getElementById('pickup-input');
                var dropoffInput = document.getElementById('dropoff-input');
                var temp = pickupInput.value;
                pickupInput.value = dropoffInput.value;
                dropoffInput.value = temp;

                // Swap markers on map
                if (window.RideFlowMap && RideFlowMap.pickupMarker && RideFlowMap.dropoffMarker) {
                    var p = RideFlowMap.pickupMarker.getLatLng();
                    var d = RideFlowMap.dropoffMarker.getLatLng();
                    RideFlowMap.setPickupMarker(d.lat, d.lng, dropoffInput.value || 'Pickup');
                    RideFlowMap.setDropoffMarker(p.lat, p.lng, pickupInput.value || 'Destination');
                    self._tryDrawRoute();
                    self.validateFindDriver();
                }
            });
        }

        // Pickup input — listen for changes (use input+change for datalist reliability)
        var pickupInput = document.getElementById('pickup-input');
        if (pickupInput) {
            function handlePickupChange() {
                var val = pickupInput.value.trim();
                if (val && val !== 'Detecting location...') {
                    self._pickupSet = true;
                    pickupInput.style.color = '';
                }
                if (window.RideFlowLocations && RideFlowLocations[val]) {
                    var loc = RideFlowLocations[val];
                    RideFlowMap.setPickupMarker(loc.lat, loc.lng, val);
                    self._tryDrawRoute();
                }
                self.validateFindDriver();
            }
            pickupInput.addEventListener('change', handlePickupChange);
            pickupInput.addEventListener('input', function () {
                // Debounce input events for datalist selections
                clearTimeout(self._pickupDebounce);
                self._pickupDebounce = setTimeout(handlePickupChange, 300);
            });

            // Also listen for Enter key
            pickupInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePickupChange();
                }
            });
        }

        // Dropoff input — listen for changes
        var dropoffInput = document.getElementById('dropoff-input');
        if (dropoffInput) {
            function handleDropoffChange() {
                var val = dropoffInput.value.trim();
                if (val) {
                    self._dropoffSet = true;
                }
                if (window.RideFlowLocations && RideFlowLocations[val]) {
                    var loc = RideFlowLocations[val];
                    RideFlowMap.setDropoffMarker(loc.lat, loc.lng, val);
                    self._tryDrawRoute();
                }
                self.validateFindDriver();
            }
            dropoffInput.addEventListener('change', handleDropoffChange);
            dropoffInput.addEventListener('input', function () {
                clearTimeout(self._dropoffDebounce);
                self._dropoffDebounce = setTimeout(handleDropoffChange, 300);
            });

            dropoffInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDropoffChange();
                }
            });
        }

        // Vehicle type selector
        var vehicleCards = document.querySelectorAll('.vehicle-card');
        vehicleCards.forEach(function (card) {
            card.addEventListener('click', function () {
                vehicleCards.forEach(function (c) { c.classList.remove('selected'); });
                card.classList.add('selected');
                self._selectedRideType = card.dataset.type;
                window.selectedRideType = card.dataset.type;

                // Recalculate fare if route exists
                if (RideFlowMap.pickupMarker && RideFlowMap.dropoffMarker) {
                    self._tryDrawRoute();
                }

                // Re-validate button state
                self.validateFindDriver();
            });
        });

        // Schedule toggle
        var scheduleToggle = document.getElementById('schedule-toggle');
        var scheduledTime = document.getElementById('scheduled-time');
        if (scheduleToggle && scheduledTime) {
            scheduleToggle.addEventListener('change', function () {
                scheduledTime.style.display = scheduleToggle.checked ? 'block' : 'none';
            });
        }

        // Promo code
        var applyPromo = document.getElementById('apply-promo');
        if (applyPromo) {
            applyPromo.addEventListener('click', function () {
                var code = document.getElementById('promo-input').value.trim();
                var msg = document.getElementById('promo-message');
                if (code) {
                    msg.style.display = 'block';
                    msg.textContent = 'Promo code applied: ' + code;
                    msg.style.color = '#16a34a';
                    showToast('Promo code applied!', 'success');
                }
            });
        }

        // Payment pills
        var paymentPills = document.querySelectorAll('.payment-pill');
        paymentPills.forEach(function (pill) {
            pill.addEventListener('click', function () {
                paymentPills.forEach(function (p) { p.classList.remove('active'); });
                pill.classList.add('active');
            });
        });

        // Find Driver button
        var findDriverBtn = document.getElementById('find-driver-btn');
        if (findDriverBtn) {
            findDriverBtn.addEventListener('click', function () {
                self._findDriver();
            });
        }
    }

    // ── Validate Find Driver button state ─────────────────────────
    validateFindDriver() {
        var pickupInput = document.getElementById('pickup-input');
        var dropoffInput = document.getElementById('dropoff-input');
        var btn = document.getElementById('find-driver-btn');

        if (!btn) return;

        var pickupVal = pickupInput ? pickupInput.value.trim() : '';
        var dropoffVal = dropoffInput ? dropoffInput.value.trim() : '';
        var hasPickup = this._pickupSet || (pickupVal !== '' && pickupVal !== 'Detecting location...');
        var hasDropoff = this._dropoffSet || dropoffVal !== '';
        var hasVehicle = !!this._selectedRideType;

        if (hasPickup && hasDropoff && hasVehicle) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
        }
    }

    // ── Try to draw route when both pickup and dropoff are set ────
    _tryDrawRoute() {
        if (!window.RideFlowMap || !RideFlowMap.pickupMarker || !RideFlowMap.dropoffMarker) return;

        var from = RideFlowMap.pickupMarker.getLatLng();
        var to = RideFlowMap.dropoffMarker.getLatLng();

        var self = this;
        RideFlowMap.drawRoute(from.lat, from.lng, to.lat, to.lng, function (result) {
            document.getElementById('route-summary').style.display = 'block';
            document.getElementById('route-distance').textContent = result.distance + ' km';
            document.getElementById('route-eta').textContent = result.duration + ' min';

            // Save for _findDriver
            self._lastCalculatedFare = result.fare;
            self._lastCalculatedDistance = result.distance;
            self._lastCalculatedEta = result.duration;

            // Calculate fares for all 3 ride types
            var baseFares = { economy: 80, comfort: 120, premium: 200 };
            var rates = { economy: 25, comfort: 35, premium: 50 };
            var ecoFare = Math.round(baseFares.economy + (rates.economy * result.distance));
            var comFare = Math.round(baseFares.comfort + (rates.comfort * result.distance));
            var premFare = Math.round(baseFares.premium + (rates.premium * result.distance));

            var ecoEl = document.getElementById('route-fare-economy');
            var comEl = document.getElementById('route-fare-comfort');
            var premEl = document.getElementById('route-fare-premium');
            if (ecoEl) ecoEl.textContent = 'PKR ' + ecoFare;
            if (comEl) comEl.textContent = 'PKR ' + comFare;
            if (premEl) premEl.textContent = 'PKR ' + premFare;

            // Also update the single fare element for the selected type
            var fareEl = document.getElementById('route-fare');
            if (fareEl) fareEl.textContent = 'PKR ' + result.fare;

            // Update fare breakdown card
            var fareBreakdown = document.getElementById('fare-breakdown');
            if (fareBreakdown) {
                fareBreakdown.style.display = 'block';
                var baseFares = { bike: 50, economy: 80, comfort: 120, premium: 200 };
                var baseFare = baseFares[self._selectedRideType || 'economy'] || 80;
                document.getElementById('base-fare').textContent = 'PKR ' + baseFare;
                var distFare = result.fare - baseFare;
                document.getElementById('distance-fare').textContent = 'PKR ' + Math.max(0, distFare);
                document.getElementById('surge-multiplier').textContent = '1.0x';
                document.getElementById('total-fare').textContent = 'PKR ' + result.fare;
            }
        });
    }

    // ── Find Driver — full Uber-like flow ──────────────────────────
    _findDriver() {
        var self = this;

        // 1. Validate all fields one final time
        if (!this._pickupSet || !this._dropoffSet || !this._selectedRideType) {
            showToast('Please set pickup, dropoff and vehicle type', 'warning');
            return;
        }

        // 2. Gather ride data
        var pickupInput = document.getElementById('pickup-input');
        var dropoffInput = document.getElementById('dropoff-input');
        var from = RideFlowMap.pickupMarker.getLatLng();
        var to = RideFlowMap.dropoffMarker.getLatLng();

        var rideId = 'ride_' + Date.now();
        var rideRequest = {
            id: rideId,
            status: 'searching',
            rider: {
                name: this.currentUser.full_name || this.currentUser.name || 'Rider',
                phone: this.currentUser.phone_number || this.currentUser.phone || '',
                rating: 4.8
            },
            pickup: {
                lat: from.lat,
                lng: from.lng,
                address: pickupInput ? pickupInput.value : 'Pickup'
            },
            dropoff: {
                lat: to.lat,
                lng: to.lng,
                address: dropoffInput ? dropoffInput.value : 'Destination'
            },
            vehicle: this._selectedRideType,
            fare: this._lastCalculatedFare || 0,
            distance: this._lastCalculatedDistance || 0,
            eta: this._lastCalculatedEta || 0,
            timestamp: Date.now(),
            driverLocation: null,
            driverDetails: null
        };

        // --- Start of API Integration ---
        const locationMapping = {
            "F-10 Markaz": 1,
            "Blue Area": 2,
            "Jinnah Super Market": 3,
            "G-9 Markaz": 4,
            "I-8 Markaz": 5,
            "F-6 (Super Market)": 6,
            "F-8 Markaz": 7,
            "G-11 Markaz": 8
        };

        const getLocId = (address) => {
            for (let name in locationMapping) {
                if (address.includes(name)) return locationMapping[name];
            }
            return 1; // Default to F-10
        };

        const pickupId = getLocId(rideRequest.pickup.address);
        const dropoffId = getLocId(rideRequest.dropoff.address);

        // Call the backend API
            window.riderAPI.requestRide({
                pickup_location_id: pickupId,
                dropoff_location_id: dropoffId,
                ride_type: this._selectedRideType === 'bike' ? 'Bike' : (this._selectedRideType === 'premium' ? 'Premium' : 'Economy'),
                distance_km: this._lastCalculatedDistance || 0,
                estimated_fare: this._lastCalculatedFare || 0
            }).then(response => {
                console.log('Ride requested on server:', response);
                if (response && response.id) {
                    // Update our local ride object with the server ID
                    rideRequest.server_id = response.id;
                    // Sync to shared state again with server ID
                    window.RideState.setRide(rideRequest);
                }
            }).catch(err => {
                console.error('Failed to request ride on server:', err);
                showToast('Server request failed, using local mode', 'warning');
            });
        // --- End of API Integration ---

        // 3. Save to shared state (driver will see this within 1 second)
        window.RideState.setRide(rideRequest);

        // 4. Show the searching screen
        this._showSearchingScreen(rideRequest);
    }

    // ── PHASE 1: Searching Screen ────────────────────────────────
    _showSearchingScreen(ride) {
        var self = this;
        var container = document.getElementById('main-content');

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;padding:24px;background:#f8fafc;">
                <!-- Radar Pulse Animation -->
                <div style="position:relative;width:200px;height:200px;margin-bottom:32px;">
                    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.15);animation:rfRadar 2s infinite;"></div>
                    <div style="position:absolute;inset:20px;border-radius:50%;background:rgba(37,99,235,0.2);animation:rfRadar 2s infinite 0.4s;"></div>
                    <div style="position:absolute;inset:40px;border-radius:50%;background:rgba(37,99,235,0.3);animation:rfRadar 2s infinite 0.8s;"></div>
                    <div style="position:absolute;inset:60px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;">
                        <span style="font-size:40px;">🔍</span>
                    </div>
                </div>
                <style>
                    @keyframes rfRadar {
                        0%   { transform: scale(0.8); opacity: 1; }
                        100% { transform: scale(1.6); opacity: 0; }
                    }
                </style>
                <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:8px;">Searching for nearby drivers...</h2>
                <p style="color:#64748b;margin-bottom:24px;">Connecting you with the closest driver</p>
                <div id="rider-searching-map" style="height:250px;width:100%;max-width:400px;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;"></div>
                <button id="cancel-search-btn" style="padding:14px 48px;background:#ef4444;color:white;border:none;border-radius:30px;font-weight:700;font-size:16px;cursor:pointer;">Cancel</button>
            </div>
        `;

        // Init small map showing pickup
        setTimeout(function () {
            if (window.RideFlowMap) {
                RideFlowMap.destroyMap();
                RideFlowMap.initRiderMap('rider-searching-map');
                RideFlowMap.setPickupMarker(ride.pickup.lat, ride.pickup.lng, 'Your Pickup');
            }
        }, 150);

        // Cancel button
        var cancelBtn = document.getElementById('cancel-search-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function () {
                window.RideState.clearRide();
                if (self._rideUnsubscribe) { self._rideUnsubscribe(); self._rideUnsubscribe = null; }
                showToast('Ride cancelled', 'info');
                self.renderSection('overview');
            });
        }

        showToast('🔍 Searching for your driver...', 'info');

        // Poll backend for ride status updates
        this._rideUnsubscribe = setInterval(async () => {
            try {
                if (ride.server_id) {
                    const response = await riderAPI.getCurrentRide(this.currentUser.id);
                    if (response.success && response.data) {
                        const r = response.data;
                        if (['Accepted', 'Driver En Route', 'In Progress'].includes(r.status)) {
                            clearInterval(this._rideUnsubscribe);
                            this._rideUnsubscribe = null;
                            this._showDriverFoundScreen(r);
                        }
                    }
                } else {
                    const mockRide = window.RideState.getRide();
                    if (mockRide && mockRide.status === 'accepted') {
                        clearInterval(this._rideUnsubscribe);
                        this._rideUnsubscribe = null;
                        this._showDriverFoundScreen(mockRide);
                    }
                }
            } catch (e) { console.error('Poll error', e); }
        }, 3000);
    }

    // ── PHASE 2: Driver Found Screen ─────────────────────────────
    _showDriverFoundScreen(ride) {
        var self = this;
        var container = document.getElementById('main-content');
        var driver = ride.driverDetails || {};

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;padding:24px;background:#f8fafc;min-height:80vh;">
                <!-- Driver Found Header -->
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="width:64px;height:64px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;animation:rfBounceIn 0.5s;">
                        <span style="font-size:32px;">✓</span>
                    </div>
                    <style>@keyframes rfBounceIn { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }</style>
                    <h2 style="font-size:22px;font-weight:700;color:#1e293b;">Driver Found!</h2>
                    <p style="color:#64748b;">Your driver is on the way</p>
                </div>

                <!-- Driver Details Card -->
                <div style="background:white;border-radius:16px;padding:20px;width:100%;max-width:420px;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
                        <div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:28px;">🧑‍✈️</div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:18px;">${driver.name || 'Driver'}</div>
                            <div style="color:#f59e0b;">★ ${driver.rating || '4.9'}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:12px;margin-bottom:12px;">
                        <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:10px;">
                            <div style="font-size:11px;color:#64748b;">Vehicle</div>
                            <div style="font-weight:600;">${driver.vehicle || 'Toyota Corolla'}</div>
                        </div>
                        <div style="flex:1;background:#f1f5f9;border-radius:8px;padding:10px;">
                            <div style="font-size:11px;color:#64748b;">Plate</div>
                            <div style="font-weight:600;">${driver.plate || 'ABC-123'}</div>
                        </div>
                    </div>
                    <div style="background:#eff6ff;border-radius:8px;padding:12px;text-align:center;">
                        <div style="font-size:13px;color:#64748b;">Driver arrives in</div>
                        <div id="rider-eta-countdown" style="font-size:28px;font-weight:700;color:#2563eb;">${ride.eta || 5} min</div>
                    </div>
                </div>

                <!-- Live Map -->
                <div id="rider-tracking-map" style="height:300px;width:100%;max-width:420px;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:16px;"></div>
            </div>
        `;

        showToast('🚗 Driver found! On the way.', 'success');

        // Init tracking map
        setTimeout(function () {
            if (window.RideFlowMap) {
                RideFlowMap.destroyMap();
                RideFlowMap.initRiderMap('rider-tracking-map');
                RideFlowMap.setPickupMarker(ride.pickup.lat, ride.pickup.lng, 'Your Pickup');
                RideFlowMap.setDropoffMarker(ride.dropoff.lat, ride.dropoff.lng, 'Destination');
                RideFlowMap.drawRoute(ride.pickup.lat, ride.pickup.lng, ride.dropoff.lat, ride.dropoff.lng);
            }
        }, 150);

        // Listen for driver location updates and status changes
        this._rideUnsubscribe = window.RideState.onChange(function (updatedRide) {
            if (!updatedRide) return;

            // Update driver car marker on rider map
            if (updatedRide.driverLocation && window.RideFlowMap) {
                var loc = updatedRide.driverLocation;
                if (!RideFlowMap._riderDriverMarker) {
                    var carIcon = L.divIcon({ className: '', html: '<div class="rf-car-icon">🚗</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
                    RideFlowMap._riderDriverMarker = L.marker([loc.lat, loc.lng], { icon: carIcon }).addTo(RideFlowMap.map);
                } else {
                    RideFlowMap._riderDriverMarker.setLatLng([loc.lat, loc.lng]);
                }
            }

            // Update ETA
            if (updatedRide.etaToPickup) {
                var etaEl = document.getElementById('rider-eta-countdown');
                if (etaEl) etaEl.textContent = updatedRide.etaToPickup + ' min';
            }

            if (updatedRide.status === 'arrived') {
                showToast('📍 Your driver has arrived!', 'success');
                var etaEl2 = document.getElementById('rider-eta-countdown');
                if (etaEl2) etaEl2.textContent = 'Arrived!';
            }

            if (updatedRide.status === 'in_progress') {
                if (self._rideUnsubscribe) { self._rideUnsubscribe(); self._rideUnsubscribe = null; }
                self._showRideInProgressScreen(updatedRide);
            }

            if (updatedRide.status === 'completed') {
                if (self._rideUnsubscribe) { self._rideUnsubscribe(); self._rideUnsubscribe = null; }
                self._showPaymentScreen(updatedRide);
            }
        });
    }

    // ── PHASE 5: Ride In Progress Screen ──────────────────────────
    _showRideInProgressScreen(ride) {
        var self = this;
        var container = document.getElementById('main-content');
        var driver = ride.driverDetails || {};

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;height:80vh;padding:0;">
                <!-- Status Bar -->
                <div style="background:#2563eb;color:white;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-weight:700;">Ride in Progress</div>
                        <div style="font-size:13px;opacity:0.9;">Heading to destination</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px;opacity:0.8;">ETA</div>
                        <div id="rider-trip-eta" style="font-size:20px;font-weight:700;">— min</div>
                    </div>
                </div>

                <!-- Map -->
                <div id="rider-trip-map" style="flex:1;width:100%;"></div>

                <!-- Bottom Card -->
                <div style="background:white;padding:16px 20px;border-top:1px solid #e2e8f0;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <span style="font-size:24px;">🧑‍✈️</span>
                        <div style="flex:1;">
                            <div style="font-weight:600;">${driver.name || 'Driver'}</div>
                            <div style="font-size:13px;color:#64748b;">${driver.vehicle || 'Toyota Corolla'} · ${driver.plate || 'ABC-123'}</div>
                        </div>
                        <div style="font-size:18px;font-weight:700;color:#2563eb;">PKR ${ride.fare || 0}</div>
                    </div>
                    <div style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#64748b;">
                        <span>🏁</span>
                        <span>${ride.dropoff ? ride.dropoff.address : 'Destination'}</span>
                    </div>
                </div>
            </div>
        `;

        showToast('🎉 Ride started!', 'success');

        // Init trip map showing route to dropoff
        setTimeout(function () {
            if (window.RideFlowMap) {
                RideFlowMap.destroyMap();
                RideFlowMap.initRiderMap('rider-trip-map');
                RideFlowMap.setPickupMarker(ride.pickup.lat, ride.pickup.lng, 'Pickup');
                RideFlowMap.setDropoffMarker(ride.dropoff.lat, ride.dropoff.lng, 'Destination');
                RideFlowMap.drawRoute(ride.pickup.lat, ride.pickup.lng, ride.dropoff.lat, ride.dropoff.lng, function (result) {
                    var etaEl = document.getElementById('rider-trip-eta');
                    if (etaEl) etaEl.textContent = result.duration + ' min';
                });
            }
        }, 150);

        // Listen for driver location + completion
        this._rideUnsubscribe = window.RideState.onChange(function (updatedRide) {
            if (!updatedRide) return;

            if (updatedRide.driverLocation && window.RideFlowMap) {
                var loc = updatedRide.driverLocation;
                if (!RideFlowMap._riderDriverMarker) {
                    var carIcon = L.divIcon({ className: '', html: '<div class="rf-car-icon">🚗</div>', iconSize: [28, 28], iconAnchor: [14, 14] });
                    RideFlowMap._riderDriverMarker = L.marker([loc.lat, loc.lng], { icon: carIcon }).addTo(RideFlowMap.map);
                } else {
                    RideFlowMap._riderDriverMarker.setLatLng([loc.lat, loc.lng]);
                }
            }

            if (updatedRide.status === 'completed') {
                if (self._rideUnsubscribe) { self._rideUnsubscribe(); self._rideUnsubscribe = null; }
                self._showPaymentScreen(updatedRide);
            }
        });
    }

    // ── PHASE 6: Payment + Rating Screen ──────────────────────────
    _showPaymentScreen(ride) {
        var self = this;
        var container = document.getElementById('main-content');

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;padding:24px;background:#f8fafc;">
                <!-- Payment Summary -->
                <div style="background:white;border-radius:20px;padding:28px;width:100%;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin-bottom:20px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:12px;">✅</div>
                    <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:4px;">Ride Completed!</h2>
                    <p style="color:#64748b;margin-bottom:20px;">Thank you for riding with RideFlow</p>

                    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-bottom:16px;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span style="color:#64748b;">Base fare</span>
                            <span style="font-weight:600;">PKR 80</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                            <span style="color:#64748b;">Distance (${ride.distance || 0} km)</span>
                            <span style="font-weight:600;">PKR ${Math.max(0, (ride.fare || 0) - 80)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:8px;">
                            <span style="font-weight:700;font-size:18px;">Total</span>
                            <span style="font-weight:700;font-size:22px;color:#2563eb;">PKR ${ride.fare || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- Rating -->
                <div style="background:white;border-radius:20px;padding:28px;width:100%;max-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center;">
                    <h3 style="font-weight:700;margin-bottom:16px;">Rate your driver</h3>
                    <div id="rider-rating-stars" style="display:flex;justify-content:center;gap:8px;margin-bottom:16px;">
                        <span class="rider-star" data-val="1" style="font-size:36px;cursor:pointer;color:#d1d5db;">★</span>
                        <span class="rider-star" data-val="2" style="font-size:36px;cursor:pointer;color:#d1d5db;">★</span>
                        <span class="rider-star" data-val="3" style="font-size:36px;cursor:pointer;color:#d1d5db;">★</span>
                        <span class="rider-star" data-val="4" style="font-size:36px;cursor:pointer;color:#d1d5db;">★</span>
                        <span class="rider-star" data-val="5" style="font-size:36px;cursor:pointer;color:#d1d5db;">★</span>
                    </div>
                    <button id="rider-submit-rating-btn" style="padding:12px 40px;background:#2563eb;color:white;border:none;border-radius:30px;font-weight:700;font-size:16px;cursor:pointer;">Submit</button>
                </div>
            </div>
        `;

        showToast('✅ Ride completed. Total: PKR ' + (ride.fare || 0), 'success');

        // Star rating interaction
        var selectedRating = 0;
        var stars = container.querySelectorAll('.rider-star');
        stars.forEach(function (star) {
            star.addEventListener('click', function () {
                selectedRating = parseInt(this.dataset.val);
                stars.forEach(function (s) {
                    s.style.color = parseInt(s.dataset.val) <= selectedRating ? '#f59e0b' : '#d1d5db';
                });
            });
        });

        var submitBtn = document.getElementById('rider-submit-rating-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function () {
                if (selectedRating === 0) {
                    showToast('Please select a rating', 'warning');
                    return;
                }
                showToast('Thank you for rating! ★'.repeat(selectedRating), 'success');
                window.RideState.clearRide();
                // Reset to home after 2 seconds
                setTimeout(function () {
                    self.renderSection('overview');
                }, 2000);
            });
        }
    }
    async loadRideHistory() {
        try {
            const response = await riderAPI.getRideHistory(this.currentUser.id);
            if (response.success) {
                this.rideHistory = response.data || [];
            }
        } catch (e) {
            console.error('Error loading ride history:', e);
            this.rideHistory = [];
        }
    }

    initRideHistory() {
        const listContainer = document.getElementById('ride-history-list');
        const loadingSpinner = document.getElementById('history-loading');
        
        if (!listContainer) return;
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        
        if (!this.rideHistory || this.rideHistory.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state" style="text-align:center;padding:40px;">
                    <div style="font-size:48px;margin-bottom:16px;">🚗</div>
                    <h3>No Rides Yet</h3>
                    <p class="text-muted">You haven't taken any rides yet. Your trip history will appear here.</p>
                    <button class="btn btn-primary" onclick="window.location.hash='#rider/book'" style="margin-top:16px;">Book Your First Ride</button>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.rideHistory.map(ride => `
            <div class="ride-card glass">
                <div class="ride-header">
                    <div class="ride-date">${formatDateTime(ride.created_at)}</div>
                    <div class="status-badge ${ride.status.toLowerCase()}">${ride.status}</div>
                </div>
                <div class="ride-body">
                    <div class="ride-route">
                        <div class="route-point pickup">
                            <span class="dot"></span>
                            <span class="addr">${ride.pickup_address || ride.pickup_location || 'Pickup Point'}</span>
                        </div>
                        <div class="route-line"></div>
                        <div class="route-point dropoff">
                            <span class="dot"></span>
                            <span class="addr">${ride.dropoff_address || ride.dropoff_location || 'Destination Point'}</span>
                        </div>
                    </div>
                    <div class="ride-meta">
                        <div class="meta-item">
                            <span class="label">Fare</span>
                            <span class="value">${formatCurrency(ride.final_fare || ride.subtotal || 0)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Driver</span>
                            <span class="value">${ride.driver_name || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="ride-actions">
                    <button class="btn btn-sm btn-outline" onclick="riderDash.openRideDetails(${ride.id})">Details</button>
                    ${ride.status === 'Completed' ? `<button class="btn btn-sm btn-primary" onclick="riderDash.rebookRide(${ride.id})">Rebook</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    initPayments() {
        console.log('Payments initialized');
    }
}

const riderDash = new RiderDashboard();