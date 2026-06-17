/**
 * Driver-Dashboard.js - Driver Dashboard Page
 * Shows online status, incoming rides, earnings, trips, vehicles, and support.
 */

// Fallbacks for removed mock data to prevent ReferenceErrors during rendering
window.mockRides = window.mockRides || [];
window.mockDrivers = window.mockDrivers || [];
window.mockUsers = window.mockUsers || [];
window.mockRatings = window.mockRatings || [];
window.mockComplaints = window.mockComplaints || [];
window.mockVehicles = window.mockVehicles || [];
window.mockLocations = window.mockLocations || [];
window.mockPromoCodes = window.mockPromoCodes || [];

class DriverDashboard {
    constructor() {
        this.container = document.getElementById('main-content');
        this.currentUser = getCurrentUser();
        this.driver = null;
        this.isOnline = false;
        this.layout = null;
        this.section = getCurrentRoute().section || 'overview';
        this.hashListenerAdded = false;
        this.handleHashChange = this.handleHashChange.bind(this);
        this._rideUnsubscribe = null;
        this._demoMode = false;
        this._driverSimInterval = null;
        this.incomingRequests = [];
        this.allTrips = [];
    }

    async render() {
        // Always refresh user from storage on render (fixes post-login stale state)
        this.currentUser = authStorage.getCurrentUser() || getCurrentUser();
        this.section = getCurrentRoute().section || 'overview';

        // Always reload driver profile so ID lookup uses real user
        await this.loadDriverProfile();
        if (!this.driver) {
            // silent — profile not found toast already shown
        }

        // Start watching for rides when rendering
        this._startWatchingForRides();

        this.layout = new DriverLayout({ user: this.currentUser, driver: this.driver });
        this.layout.render(this.section);

        const content = document.getElementById('driver-dashboard-content');
        content.addEventListener('driverSectionChange', (event) => {
            navigateTo('driver-dashboard', event.detail.section);
        });

        if (!this.hashListenerAdded) {
            window.addEventListener('hashchange', this.handleHashChange);
            this.hashListenerAdded = true;
        }

        await this.refreshOverviewData();
        this.renderSection(this.section);

        // Start watching for incoming ride requests from riders
        this._startWatchingForRides();
    }

    _stopWatchingForRides() {
        if (this._rideUnsubscribe) {
            clearInterval(this._rideUnsubscribe);
            this._rideUnsubscribe = null;
        }
    }


    async loadDriverProfile() {
        try {
            // 1. Refresh User Profile
            const userResponse = await authAPI.getProfile().catch(() => null);
            if (userResponse && userResponse.success && userResponse.data) {
                this.currentUser = userResponse.data;
            }

            // 2. Fetch Driver Profile using User ID
            const driverResponse = await driverAPI.getProfileByUserId(this.currentUser.id).catch(() => null);
            
            if (driverResponse && driverResponse.success && driverResponse.data) {
                this.driver = driverResponse.data;
            } else {
                // Try mock fallback only if it exists
                this.driver = window.mockDrivers.find(d => d.user_id === this.currentUser.id);
                if (!this.driver && window.mockDrivers.length > 0) {
                    this.driver = window.mockDrivers[0];
                }
            }

            if (!this.driver) {
                showToast('Driver profile not found. Please register as a driver.', 'error');
                return;
            }
            this.isOnline = this.driver.availability_status === 'Online';
        } catch (error) {
            console.error('Error loading driver profile:', error);
            showToast('Failed to load driver profile', 'error');
        }
    }

    async refreshOverviewData() {
        if (!this.driver) return;

        try {
            const [earningsResponse, requestsResponse, historyResponse] = await Promise.all([
                driverAPI.getEarnings(this.driver.id).catch(() => ({ data: [] })),
                driverAPI.getIncomingRides(this.driver.id).catch(() => ({ data: [] })),
                apiClient.get(`/rides/driver/${this.driver.id}`).catch(() => ({ data: [] }))
            ]);
            this.allTrips = historyResponse.data || window.mockRides.filter(r => r.driver_id === this.driver.id) || [];
            this.earnings = earningsResponse.data || [];
            this.incomingRequests = requestsResponse.data || [];
        } catch (error) {
            this.allTrips = [];
            this.earnings = [];
            this.incomingRequests = [];
        }
    }

    async handleHashChange() {
        const route = getCurrentRoute();
        if (route.page === 'driver-dashboard') {
            const section = route.section || 'overview';
            if (section !== this.section) {
                await this.renderSection(section);
            }
        }
    }

    async renderSection(section) {
        this.section = section || 'overview';
        this.layout.setActive(this.section);

        // Clean up any live map before switching sections
        if (window.RideFlowMap) RideFlowMap.destroyMap();

        const container = document.getElementById('driver-dashboard-content');
        container.innerHTML = '';

        switch (this.section) {
            case 'overview':
                this.renderOverview(container);
                break;
            case 'current-ride':
                this.renderCurrentRide(container);
                break;
            case 'ride-requests':
                this.renderRideRequests(container);
                break;
            case 'earnings':
                this.renderEarnings(container);
                break;
            case 'ratings':
                this.renderRatings(container);
                break;
            case 'performance':
                this.renderPerformance(container);
                break;
            case 'schedule':
                this.renderSchedule(container);
                break;
            case 'demand-zones':
                this.renderDemandZones(container);
                break;
            case 'vehicles':
                await this.renderVehicles(container);
                break;
            case 'profile':
                this.renderProfile(container);
                break;
            case 'support':
                this.renderSupport(container);
                break;
            default:
                this.renderOverview(container);
                break;
        }
    }

    renderOverview(container) {
        this.renderHome(container);
    }

    async renderRatings(container) {
        const driverId = this.driver?.id;
        
        let driverRatings = window.mockRatings.filter(r => r.rated_user_id === driverId || r.rated_by === 'Rider');
        let completedRides = this.allTrips.filter(r => r.status === 'Completed');
        
        try {
            const ratingsRes = await apiClient.get(`/users/${this.currentUser.id}`); // This is wrong, but just a fallback
            // We should use actual rating endpoints if they existed, but for now we won't crash
        } catch(e) {}
        const pendingReviewRides = completedRides.filter(ride =>
            !driverRatings.some(r => r.ride_id === ride.id && r.rated_by === 'Driver')
        );

        const avgScore = (this.driver && this.driver.average_rating && this.driver.average_rating > 0)
            ? parseFloat(this.driver.average_rating).toFixed(1)
            : 'N/A';

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        driverRatings.forEach(r => { if (distribution[r.score] !== undefined) distribution[r.score]++; });
        const totalRatings = driverRatings.length || 1;

        container.innerHTML = `
            <div class="ratings-layout" style="display:flex;flex-direction:column;gap:20px;">
                <!-- Rating Summary Card -->
                <div class="card glass" style="padding:24px;">
                    <h3 style="margin-bottom:16px;">⭐ Your Rider Ratings</h3>
                    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">
                        <div style="text-align:center;">
                            <div style="font-size:48px;font-weight:700;color:var(--rf-driver-primary, #059669);">${avgScore}</div>
                            <div style="font-size:14px;color:var(--rf-text-muted);">${totalRatings} rating${totalRatings !== 1 ? 's' : ''}</div>
                        </div>
                        <div style="flex:1;min-width:200px;">
                            ${[5,4,3,2,1].map(star => `
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                    <span style="width:30px;font-size:13px;">${star}★</span>
                                    <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;">
                                        <div style="background:#f59e0b;height:8px;border-radius:4px;width:${(distribution[star]/totalRatings)*100}%;"></div>
                                    </div>
                                    <span style="width:24px;font-size:13px;color:var(--rf-text-muted);">${distribution[star]}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Recent Reviews -->
                <div class="card">
                    <div class="card-header"><h3>Recent Reviews from Riders</h3></div>
                    <div class="card-body">
                        ${driverRatings.length > 0 ? driverRatings.slice(0, 10).map(rating => {
                            const ride = this.allTrips.find(r => r.id === rating.ride_id) || window.mockRides.find(r => r.id === rating.ride_id);
                            const rider = window.mockUsers.find(u => u.id === rating.rated_by || (ride && u.id === ride.rider_id));
                            return `
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--rf-border, #e2e8f0);">
                                    <div>
                                        <div style="font-weight:600;">${rider?.full_name || 'Rider'}</div>
                                        <div style="color:#f59e0b;font-size:14px;">${'★'.repeat(rating.score)}${'☆'.repeat(5-rating.score)}</div>
                                        ${rating.comment ? `<div style="color:var(--rf-text-muted);font-size:14px;margin-top:4px;">"${rating.comment}"</div>` : ''}
                                    </div>
                                    <div class="text-muted" style="font-size:12px;">${formatDate(rating.created_at)}</div>
                                </div>
                            `;
                        }).join('') : '<p class="text-muted">No rider reviews yet. Complete rides to start receiving ratings!</p>'}
                    </div>
                </div>

                <!-- Rate a Rider -->
                ${pendingReviewRides.length > 0 ? `
                <div class="card">
                    <div class="card-header"><h3>Rate a Rider</h3></div>
                    <div class="card-body">
                        <form id="driver-rate-rider-form" style="display:flex;flex-direction:column;gap:14px;">
                            <div class="form-group">
                                <label>Select completed ride</label>
                                <select name="ride_id" class="form-control" required>
                                    <option value="">Choose a ride</option>
                                    ${pendingReviewRides.map(ride => {
                                        const rider = window.mockUsers.find(u => u.id === ride.rider_id) || { full_name: 'Unknown Rider' };
                                        return `<option value="${ride.id}">Ride #${ride.id} — ${rider?.full_name || 'Rider'}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Rating</label>
                                <div class="star-rating-input" id="driver-star-input">
                                    ${[1,2,3,4,5].map(s => `<span class="star-btn" data-score="${s}" style="font-size:24px;cursor:pointer;color:#d1d5db;">★</span>`).join('')}
                                </div>
                                <input type="hidden" name="score" id="driver-rating-score" value="">
                            </div>
                            <div class="form-group">
                                <label>Comment (optional)</label>
                                <textarea name="comment" class="form-control" rows="3" placeholder="Share feedback about this rider..."></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Submit Rating</button>
                        </form>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Star rating click handler
        const starInput = document.getElementById('driver-star-input');
        const scoreInput = document.getElementById('driver-rating-score');
        if (starInput && scoreInput) {
            starInput.querySelectorAll('.star-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const score = parseInt(btn.dataset.score);
                    scoreInput.value = score;
                    starInput.querySelectorAll('.star-btn').forEach((b, i) => {
                        b.style.color = i < score ? '#f59e0b' : '#d1d5db';
                    });
                });
            });
        }

        // Form submit
        const form = document.getElementById('driver-rate-rider-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form));
                if (!data.ride_id || !data.score) {
                    showToast('Please select a ride and rating score.', 'warning');
                    return;
                }
                try {
                    await riderAPI.rateRide(Number(data.ride_id), {
                        rated_by: 'Driver',
                        rated_user_id: mockRides.find(r => r.id === Number(data.ride_id))?.rider_id,
                        score: Number(data.score),
                        comment: data.comment || ''
                    });
                    showToast('Rider review submitted.', 'success');
                    this.renderSection('ratings');
                } catch (error) {
                    showToast(error.message, 'error');
                }
            });
        }
    }

    // === SECTION 1: renderHome() — Driver Command Center ===
    renderHome(container) {
        const todayStats = this.getTodayStats();
        const isOnline = this.isOnline;

        container.innerHTML = `
            <div class="driver-home-layout">
                <!-- Demo Banner -->
                <div style="background:linear-gradient(135deg,#059669,#047857);color:white;padding:8px 20px;text-align:center;font-size:12px;font-weight:600;border-radius:8px;margin-bottom:12px;">
                    🎯 Demo Mode — Simulated rides & earnings. No real transactions.
                </div>

                <!-- Status Area (55% height) -->
                <div class="driver-map-container" style="background:var(--rf-surface); border:1px solid var(--rf-border); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; text-align:center;">
                    <h2 style="margin-bottom:8px; color:var(--rf-text);">City: ${this.currentUser.city || 'Islamabad'}</h2>
                    <p style="color:var(--rf-text-muted); margin-bottom:24px;">Waiting for ride requests in your area.</p>

                    <!-- Online/Offline Toggle -->
                    <div style="position:relative; z-index:10;">
                        <button id="online-toggle-btn" class="online-toggle-btn ${isOnline ? 'online' : 'offline'}" style="position:relative; top:auto; left:auto; transform:none; padding:12px 32px; font-size:16px;">
                            <span class="toggle-icon">${isOnline ? '🟢' : '🔴'}</span>
                            <span class="toggle-text">${isOnline ? 'Go Offline' : 'Go Online'}</span>
                        </button>
                    </div>

                    <!-- Offline Banner -->
                    <div id="offline-banner" class="offline-banner" style="display: ${isOnline ? 'none' : 'block'}; position:relative; margin-top:16px; top:auto; left:auto; transform:none;">
                        <div class="offline-content">
                            <span class="offline-icon">🚫</span>
                            <span>You are offline</span>
                        </div>
                    </div>
                </div>

                <!-- Control Panel (45% height) -->
                <div class="driver-control-panel">
                    <!-- Stats Bar -->
                    <div class="driver-stats-bar">
                        <div class="stats-scroll-container">
                            <div class="stat-card earnings">
                                <div class="stat-icon">💰</div>
                                <div class="stat-content">
                                    <div class="stat-value">${formatCurrency(todayStats.earnings)}</div>
                                    <div class="stat-label">Today's Earnings</div>
                                </div>
                            </div>

                            <div class="stat-card trips">
                                <div class="stat-icon">🚗</div>
                                <div class="stat-content">
                                    <div class="stat-value">${todayStats.trips}</div>
                                    <div class="stat-label">Trips Completed</div>
                                </div>
                            </div>

                            <div class="stat-card hours">
                                <div class="stat-icon">⏰</div>
                                <div class="stat-content">
                                    <div class="stat-value">${todayStats.hours}h</div>
                                    <div class="stat-label">Online Hours</div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${(todayStats.hours / 8) * 100}%"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="stat-card acceptance">
                                <div class="stat-icon">✅</div>
                                <div class="stat-content">
                                    <div class="stat-value">${todayStats.acceptanceRate}%</div>
                                    <div class="stat-label">Acceptance Rate</div>
                                    <div class="circular-progress">
                                        <svg width="40" height="40">
                                            <circle cx="20" cy="20" r="18" stroke="var(--rf-border)" stroke-width="3" fill="none"/>
                                            <circle cx="20" cy="20" r="18" stroke="var(--rf-driver-primary)" stroke-width="3" fill="none"
                                                    stroke-dasharray="${2 * Math.PI * 18}" stroke-dashoffset="${2 * Math.PI * 18 * (1 - todayStats.acceptanceRate / 100)}"
                                                    transform="rotate(-90 20 20)"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div class="stat-card rating">
                                <div class="stat-icon">⭐</div>
                                <div class="stat-content">
                                    <div class="stat-value">${this.driver?.average_rating || 'N/A'}</div>
                                    <div class="stat-label">Current Rating</div>
                                    <div class="rating-trend ${todayStats.ratingTrend > 0 ? 'up' : todayStats.ratingTrend < 0 ? 'down' : ''}">
                                        ${todayStats.ratingTrend > 0 ? '↗' : todayStats.ratingTrend < 0 ? '↘' : '→'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="driver-quick-actions">
                        <button class="action-btn" onclick="driverDash.viewEarnings()">
                            <span class="action-icon">📊</span>
                            <span>View Earnings</span>
                        </button>
                        <button class="action-btn" onclick="driverDash.viewSchedule()">
                            <span class="action-icon">📅</span>
                            <span>My Schedule</span>
                        </button>
                        <button class="action-btn" onclick="driverDash.viewPerformance()">
                            <span class="action-icon">🏆</span>
                            <span>Performance</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Incoming Ride Request Panel (hidden by default) -->
            <div id="incoming-request-panel" class="incoming-request-panel" style="display: none;">
                <div class="request-header">
                    <div class="request-title">🚨 New Ride Request</div>
                    <div class="countdown-timer">
                        <svg width="60" height="60">
                            <circle cx="30" cy="30" r="25" stroke="var(--rf-border)" stroke-width="4" fill="none"/>
                            <circle id="countdown-circle" cx="30" cy="30" r="25" stroke="var(--rf-driver-primary)" stroke-width="4" fill="none"
                                    stroke-dasharray="${2 * Math.PI * 25}" stroke-dashoffset="0"
                                    transform="rotate(-90 30 30)"/>
                        </svg>
                        <div class="countdown-text" id="countdown-text">15</div>
                    </div>
                </div>

                <div class="rider-info">
                    <div class="rider-avatar">
                        <img src="https://via.placeholder.com/60x60?text=Rider" alt="Rider">
                    </div>
                    <div class="rider-details">
                        <div class="rider-name" id="incoming-rider-name" style="color:var(--rf-text); font-weight:700;">Alaxandar</div>
                        <div class="rider-rating">⭐ 4.8</div>
                        <div class="pickup-distance" id="incoming-pickup-dist">📍 2.3 km away</div>
                        <div class="estimated-earnings" id="incoming-est-fare">💰 Est. PKR 450</div>
                    </div>
                </div>

                <div class="route-preview">
                    <div id="request-route-map" class="request-route-map"></div>
                    <div class="route-details">
                        <div class="route-leg">
                            <span class="route-icon">🚗</span>
                            <span>You → Pickup: 2.3 km</span>
                        </div>
                        <div class="route-leg">
                            <span class="route-icon">🎯</span>
                            <span>Pickup → Dropoff: 8.7 km</span>
                        </div>
                    </div>
                </div>

                <div class="request-actions">
                    <button id="accept-ride-btn" class="accept-btn">
                        <span class="btn-icon">✅</span>
                        <span>ACCEPT</span>
                    </button>
                    <button id="decline-ride-btn" class="decline-btn">
                        <span class="btn-icon">❌</span>
                        <span>DECLINE</span>
                    </button>
                </div>
            </div>
        `;

        // Removed this.initHomeMap();
        this.initOnlineToggle();
        this.simulateIncomingRequest();
    }

    renderCurrentRide(container) {
        this.renderActiveTrip(container);
    }

    renderActiveTrip(container) {
        const currentRide = this.allTrips.find(r => r.driver_id === this.driver.id && ['Accepted', 'Driver En Route', 'In Progress'].includes(r.status));
        if (!currentRide) {
            container.innerHTML = `
                <div class="no-active-trip">
                    <div class="no-trip-icon">🚗</div>
                    <h3>No Active Trip</h3>
                    <p>You are not currently on a trip.</p>
                    <button class="btn btn-primary" onclick="driverDash.goHome()">Return to Home</button>
                </div>
            `;
            return;
        }

        const rider = mockUsers.find(u => u.id === currentRide.rider_id) || {};
        const pickupAddress = this.getRideLocationLabel(currentRide, 'pickup');
        const dropoffAddress = this.getRideLocationLabel(currentRide, 'dropoff');

        container.innerHTML = `
            <div class="active-trip-layout">
            <div class="active-trip-layout">
                <div style="background:var(--rf-surface); border:1px solid var(--rf-border); border-radius:12px; padding:24px; margin-top:16px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">🚖</div>
                    <h2 style="margin-bottom:8px;">${currentRide.status}</h2>
                    <p style="color:var(--rf-text-muted);">Drive safely to your destination.</p>
                </div>

                <div style="display:flex; gap:16px; margin-top:12px; flex-wrap:wrap;">
                    <div style="background:#eff6ff; border-radius:8px; padding:10px 16px; flex:1;">
                        <div style="font-size:12px; color:#6b7280;">Estimated Distance</div>
                        <div style="font-size:20px; font-weight:600;" id="driver-trip-distance">${currentRide.distance_km || 5} km</div>
                    </div>
                    <div style="background:#f0fdf4; border-radius:8px; padding:10px 16px; flex:1;">
                        <div style="font-size:12px; color:#6b7280;">Estimated Fare</div>
                        <div style="font-size:20px; font-weight:600;" id="driver-eta-pickup">PKR ${currentRide.estimated_fare || 350}</div>
                    </div>
                </div>

                <!-- Rider Info Panel (Bottom Left) -->
                <div class="rider-info-panel">
                    <div class="rider-header">
                        <div class="rider-avatar">
                            <img src="https://via.placeholder.com/50x50?text=${rider.full_name?.charAt(0) || 'R'}" alt="Rider">
                        </div>
                        <div class="rider-details">
                            <div class="rider-name">${rider.full_name || 'Unknown Rider'}</div>
                            <div class="rider-phone">${rider.phone || '+92 XXX XXXXXXX'}</div>
                        </div>
                    </div>
                    <div class="rider-actions">
                        <button class="call-rider-btn" onclick="driverDash.callRider()">
                            <span class="call-icon">📞</span>
                            <span>Call Rider</span>
                        </button>
                    </div>
                    <div class="pickup-address">
                        <div class="address-label">Pickup Location</div>
                        <div class="address-text">${pickupAddress}</div>
                        <button class="copy-btn" onclick="driverDash.copyAddress('${pickupAddress}')">
                            <span class="copy-icon">📋</span>
                        </button>
                    </div>
                </div>

                <!-- Trip Meter Panel (Bottom Right) -->
                <div class="trip-meter-panel">
                    <div class="meter-item">
                        <div class="meter-label">Distance</div>
                        <div class="meter-value" id="distance-counter">0.0 km</div>
                    </div>
                    <div class="meter-item">
                        <div class="meter-label">Fare</div>
                        <div class="meter-value" id="fare-counter">PKR 0</div>
                    </div>
                    <div class="meter-item">
                        <div class="meter-label">Duration</div>
                        <div class="meter-value" id="duration-counter">00:00</div>
                    </div>
                </div>

                <!-- Status Buttons (Bottom Center) -->
                <div class="status-buttons">
                    <button id="status-action-btn" class="status-btn primary">
                        <span class="btn-text">Arrived at Pickup</span>
                    </button>
                    <button id="simulate-driver-btn" class="status-btn secondary" style="background:#2563eb;color:white;">
                        <span class="btn-text">Simulate Driver Movement</span>
                    </button>
                    <button class="status-btn secondary" onclick="driverDash.emergencyStop()">
                        <span class="btn-text">Emergency Stop</span>
                    </button>
                </div>
            </div>
        `;

        this.initActiveTrip();
    }

    renderRideRequests(container) {
        if (!this.incomingRequests || this.incomingRequests.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-header"><h3>Ride Requests</h3></div>
                    <div class="card-body"><p class="text-muted">No pending requests right now.</p></div>
                </div>
            `;
            return;
        }

        container.innerHTML = '<div class="card"><div class="card-header"><h3>Ride Requests</h3></div><div class="card-body" id="ride-requests-list"></div></div>';
        const list = document.getElementById('ride-requests-list');
        list.innerHTML = this.incomingRequests.map(request => {
            const rider = window.mockUsers?.find(u => u.id === request.rider_id) || { full_name: request.rider_name || 'Rider' };
            const isSameCity = true; // We now filter by city on backend
            
            return `
                <div class="ride-request-card">
                    <div>
                        <p><strong>Pickup:</strong> ${this.getRideLocationLabel(request, 'pickup')}</p>
                        <p><strong>Drop-off:</strong> ${this.getRideLocationLabel(request, 'dropoff')}</p>
                        <p><strong>Rider:</strong> ${rider.full_name || 'Unknown'}</p>
                        <p><strong>Est. Distance:</strong> ${request.distance_km || 5.0} km</p>
                        <p><strong>Est. Fare:</strong> PKR ${request.estimated_fare || 350}</p>
                    </div>
                    <div class="ride-request-actions">
                        <button class="btn btn-danger-outline" onclick="driverDash.rejectRide(${request.id})">Reject</button>
                        <button class="btn btn-success" onclick="driverDash.acceptRide(${request.id})">Accept</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // === SECTION 5: renderPerformance() ===
    renderPerformance(container) {
        const performanceData = this.getPerformanceData();

        container.innerHTML = `
            <div class="performance-layout">
                <!-- Rating Overview -->
                <div class="rating-overview-card">
                    <div class="rating-header">
                        <div class="rating-display">
                            <div class="rating-stars">
                                ${this.renderStars(performanceData.overallRating)}
                            </div>
                            <div class="rating-score">${performanceData.overallRating}</div>
                        </div>
                        <div class="rating-meta">
                            <div class="total-ratings">${performanceData.totalRatings} ratings</div>
                            <div class="rating-trend ${performanceData.ratingTrend > 0 ? 'up' : performanceData.ratingTrend < 0 ? 'down' : ''}">
                                ${performanceData.ratingTrend > 0 ? '↗' : performanceData.ratingTrend < 0 ? '↘' : '→'} ${Math.abs(performanceData.ratingTrend)} this week
                            </div>
                        </div>
                    </div>

                    <!-- Rating Distribution -->
                    <div class="rating-distribution">
                        ${[5,4,3,2,1].map(stars => `
                            <div class="rating-bar">
                                <div class="rating-label">${stars}★</div>
                                <div class="rating-bar-bg">
                                    <div class="rating-bar-fill" style="width: ${(performanceData.ratingDistribution[stars] / performanceData.totalRatings) * 100}%"></div>
                                </div>
                                <div class="rating-count">${performanceData.ratingDistribution[stars]}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Acceptance Rate Chart -->
                <div class="acceptance-rate-card">
                    <h3>Acceptance Rate Trend (Last 30 Days)</h3>
                    <div class="sparkline-container">
                        <svg class="acceptance-sparkline" width="100%" height="60" viewBox="0 0 300 60">
                            ${this.renderAcceptanceSparkline(performanceData.acceptanceHistory)}
                        </svg>
                        <div class="sparkline-stats">
                            <div class="current-rate">${performanceData.currentAcceptanceRate}%</div>
                            <div class="rate-change ${performanceData.acceptanceChange > 0 ? 'positive' : 'negative'}">
                                ${performanceData.acceptanceChange > 0 ? '+' : ''}${performanceData.acceptanceChange}% from last week
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Badges Section -->
                <div class="badges-section">
                    <h3>Earned Badges</h3>
                    <div class="badges-grid">
                        ${performanceData.badges.map(badge => `
                            <div class="badge-card ${badge.unlocked ? 'unlocked' : 'locked'}">
                                <div class="badge-icon">${badge.icon}</div>
                                <div class="badge-info">
                                    <div class="badge-name">${badge.name}</div>
                                    <div class="badge-description">${badge.description}</div>
                                    ${!badge.unlocked ? `
                                        <div class="badge-progress">
                                            <div class="progress-bar">
                                                <div class="progress-fill" style="width: ${badge.progress}%"></div>
                                            </div>
                                            <div class="progress-text">${badge.current}/${badge.target}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Rider Feedback -->
                <div class="feedback-section">
                    <h3>Recent Rider Feedback</h3>
                    <div class="feedback-list">
                        ${performanceData.recentFeedback.map(feedback => `
                            <div class="feedback-item">
                                <div class="feedback-header">
                                    <div class="feedback-rating">${this.renderStars(feedback.rating)}</div>
                                    <div class="feedback-date">${feedback.date}</div>
                                </div>
                                <div class="feedback-comment">${feedback.comment}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Leaderboard Ranking -->
                <div class="leaderboard-card">
                    <h3>City Leaderboard</h3>
                    <div class="leaderboard-position">
                        <div class="position-icon">🏆</div>
                        <div class="position-info">
                            <div class="position-rank">#${performanceData.leaderboardRank}</div>
                            <div class="position-label">in Islamabad</div>
                        </div>
                        <div class="position-stats">
                            <div class="stat-item">
                                <span class="stat-value">${performanceData.monthlyTrips}</span>
                                <span class="stat-label">trips this month</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDriverRatingForm(pendingRides) {
        const container = document.getElementById('driver-rating-form');
        if (!pendingRides.length) {
            container.innerHTML = '<p class="text-muted">There are no completed rides waiting for passenger review.</p>';
            return;
        }

        container.innerHTML = `
            <form id="driver-rate-form" style="display:flex; flex-direction:column; gap:14px;">
                <div class="form-group required">
                    <label>Select ride</label>
                    <select name="ride_id" class="form-control" required>
                        <option value="">Choose a completed ride</option>
                        ${pendingRides.map(ride => `<option value="${ride.id}">Ride #${ride.id} — ${this.getRideLocationLabel(ride, 'pickup')} → ${this.getRideLocationLabel(ride, 'dropoff')}</option>`).join('')}
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
                    <textarea name="comment" class="form-control" rows="4" placeholder="Provide feedback for the rider"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Submit Review</button>
            </form>
        `;

        document.getElementById('driver-rate-form').addEventListener('submit', (e) => this.submitDriverRating(e));
    }

    async submitDriverRating(event) {
        event.preventDefault();
        const form = event.target;
        const data = Object.fromEntries(new FormData(form));

        if (!data.ride_id || !data.rating) {
            showToast('Please choose a ride and rating score.', 'warning');
            return;
        }

        const ride = mockRides.find(item => item.id === Number(data.ride_id));
        if (!ride) {
            showToast('Selected ride not found.', 'error');
            return;
        }

        try {
            await riderAPI.rateRide(ride.id, {
                rated_by: 'Driver',
                rated_user_id: ride.rider_id,
                score: Number(data.rating),
                comment: data.comment || ''
            });
            showToast('Rider review submitted.', 'success');
            this.renderSection('ratings');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // === SECTION 3: renderEarnings() — Financial Dashboard ===
    renderEarnings(container) {
        const period = 'today'; // Can be 'today', 'week', 'month'
        const earningsData = this.getEarningsData(period);
        const chartData = this.getEarningsChartData();

        container.innerHTML = `
            <div class="earnings-layout">
                <!-- Summary Cards -->
                <div class="earnings-summary">
                    <div class="period-selector">
                        <button class="period-btn active" data-period="today">Today</button>
                        <button class="period-btn" data-period="week">This Week</button>
                        <button class="period-btn" data-period="month">This Month</button>
                    </div>

                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-icon">💰</div>
                            <div class="summary-content">
                                <div class="summary-value">${formatCurrency(earningsData.total)}</div>
                                <div class="summary-label">Total Earnings</div>
                            </div>
                        </div>

                        <div class="summary-card">
                            <div class="summary-icon">🚗</div>
                            <div class="summary-content">
                                <div class="summary-value">${earningsData.trips}</div>
                                <div class="summary-label">Trips Completed</div>
                            </div>
                        </div>

                        <div class="summary-card">
                            <div class="summary-icon">📊</div>
                            <div class="summary-content">
                                <div class="summary-value">${formatCurrency(earningsData.average)}</div>
                                <div class="summary-label">Average per Trip</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Earnings Chart -->
                <div class="earnings-chart-section">
                    <h3>Earnings Trend (Last 7 Days)</h3>
                    <div class="earnings-chart">
                        <svg id="earnings-chart-svg" width="100%" height="200" viewBox="0 0 700 200">
                            ${this.renderEarningsChart(chartData)}
                        </svg>
                    </div>
                </div>

                <!-- Trips Table -->
                <div class="trips-table-section">
                    <h3>Recent Trips</h3>
                    <div class="trips-table">
                        <div class="table-header">
                            <div>Trip ID</div>
                            <div>Rider</div>
                            <div>Fare</div>
                            <div>Commission (15%)</div>
                            <div>Net Earning</div>
                        </div>
                        ${earningsData.recentTrips.map(trip => `
                            <div class="table-row">
                                <div>#${trip.id}</div>
                                <div>${trip.rider}</div>
                                <div>${formatCurrency(trip.fare)}</div>
                                <div class="commission">${formatCurrency(trip.commission)}</div>
                                <div class="net-earning">${formatCurrency(trip.net)}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="commission-info">
                        <p><strong>Commission Formula:</strong> Fare × 0.85 = Net Earning</p>
                    </div>
                </div>

                <!-- Payout Section -->
                <div class="payout-section">
                    <div class="payout-card">
                        <div class="payout-header">
                            <h3>Request Payout</h3>
                            <div class="payout-balance">
                                <span class="balance-label">Available Balance:</span>
                                <span class="balance-amount">${formatCurrency(earningsData.available)}</span>
                            </div>
                        </div>

                        <div class="payout-form" id="payout-form" style="display: none;">
                            <div class="form-group">
                                <label>Bank Account Number</label>
                                <input type="text" class="form-control" id="account-number" placeholder="Enter account number">
                            </div>
                            <div class="form-group">
                                <label>Bank Name</label>
                                <input type="text" class="form-control" id="bank-name" placeholder="Enter bank name">
                            </div>
                            <div class="form-group">
                                <label>Amount to Withdraw</label>
                                <input type="number" class="form-control" id="withdraw-amount" placeholder="Minimum PKR 500" min="500" max="${earningsData.available}">
                            </div>
                            <div class="form-actions">
                                <button class="btn btn-secondary" onclick="driverDash.cancelPayout()">Cancel</button>
                                <button class="btn btn-primary" onclick="driverDash.submitPayout()">Submit Request</button>
                            </div>
                        </div>

                        <div class="payout-actions">
                            <button class="btn btn-primary" id="request-payout-btn" onclick="driverDash.showPayoutForm()" ${earningsData.available < 500 ? 'disabled' : ''}>
                                Request Payout
                            </button>
                            ${earningsData.available < 500 ? '<p class="payout-note">Minimum payout amount is PKR 500</p>' : ''}
                        </div>
                    </div>

                    <!-- Payout History -->
                    <div class="payout-history">
                        <h4>Payout History</h4>
                        <div class="history-list">
                            ${earningsData.payoutHistory.map(payout => `
                                <div class="history-item ${payout.status.toLowerCase()}">
                                    <div class="history-info">
                                        <div class="history-amount">${formatCurrency(payout.amount)}</div>
                                        <div class="history-date">${payout.date}</div>
                                    </div>
                                    <div class="history-status">
                                        <span class="status-pill ${payout.status.toLowerCase()}">${payout.status}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initEarningsInteractions();
    }

    async handlePayoutRequest() {
        try {
            showToast('Submitting payout request...', 'info');
            await driverAPI.requestPayout(this.driver.id);
            showToast('Payout request submitted successfully.', 'success');
            await this.refreshOverviewData();
            this.renderSection('earnings');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async toggleAvailability() {
        const nextStatus = this.driver.availability_status === 'Online' ? 'Offline' : 'Online';
        try {
            showToast(`Setting status to ${nextStatus}...`, 'info');
            await driverAPI.updateDriverStatus(this.driver.id, nextStatus);
            this.driver.availability_status = nextStatus;
            this.isOnline = nextStatus === 'Online';
            showToast(`You are now ${nextStatus}.`, 'success');
            this.renderSection(this.section);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    // === SECTION 4: renderVehicles() ===
    async renderVehicles(container) {
        const vehicles = this.getDriverVehicles();

        container.innerHTML = `
            <div class="vehicles-layout">
                <!-- Active Vehicle Selector -->
                ${vehicles.length > 1 ? `
                    <div class="active-vehicle-selector">
                        <h3>Switch Active Vehicle</h3>
                        <select class="form-control" id="active-vehicle-select">
                            ${vehicles.map(vehicle => `
                                <option value="${vehicle.id}" ${vehicle.isActive ? 'selected' : ''}>
                                    ${vehicle.make} ${vehicle.model} - ${vehicle.licensePlate}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                ` : ''}

                <!-- Vehicle Cards -->
                <div class="vehicle-cards-grid">
                    ${vehicles.map(vehicle => `
                        <div class="vehicle-card ${vehicle.isActive ? 'active' : ''}">
                            <div class="vehicle-header">
                                <div class="vehicle-photo">
                                    ${vehicle.photo ? `<img src="${vehicle.photo}" alt="${vehicle.make} ${vehicle.model}">` : `
                                    <svg viewBox="0 0 200 150" style="width:100%;height:100%;background:#f1f5f9;border-radius:8px;">
                                        <g transform="translate(30,25)">
                                            <path d="M20,70 L30,40 Q35,30 50,28 L90,28 Q105,30 110,40 L120,70" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
                                            <rect x="10" y="70" width="120" height="35" rx="6" fill="${vehicle.isActive ? '#059669' : '#64748b'}" opacity="0.85"/>
                                            <rect x="35" y="38" width="30" height="25" rx="3" fill="#bfdbfe" stroke="#94a3b8" stroke-width="1"/>
                                            <rect x="75" y="38" width="30" height="25" rx="3" fill="#bfdbfe" stroke="#94a3b8" stroke-width="1"/>
                                            <circle cx="35" cy="108" r="10" fill="#334155" stroke="#1e293b" stroke-width="2"/>
                                            <circle cx="35" cy="108" r="4" fill="#94a3b8"/>
                                            <circle cx="105" cy="108" r="10" fill="#334155" stroke="#1e293b" stroke-width="2"/>
                                            <circle cx="105" cy="108" r="4" fill="#94a3b8"/>
                                            <rect x="125" y="78" width="8" height="8" rx="2" fill="#f59e0b"/>
                                            <rect x="125" y="90" width="8" height="8" rx="2" fill="#ef4444"/>
                                            <rect x="5" y="78" width="8" height="8" rx="2" fill="#f59e0b"/>
                                            <rect x="5" y="90" width="8" height="8" rx="2" fill="#ef4444"/>
                                        </g>
                                        <text x="100" y="145" text-anchor="middle" font-size="11" fill="#64748b" font-family="system-ui">${vehicle.make} ${vehicle.model}</text>
                                    </svg>`}
                                </div>
                                <div class="vehicle-status">
                                    <span class="status-badge ${vehicle.verificationStatus.toLowerCase()}">
                                        ${vehicle.verificationStatus}
                                    </span>
                                </div>
                            </div>

                            <div class="vehicle-info">
                                <div class="vehicle-name">${vehicle.make} ${vehicle.model}</div>
                                <div class="vehicle-type">${vehicle.type}</div>
                                <div class="vehicle-plate">${vehicle.licensePlate}</div>
                            </div>

                            ${vehicle.verificationStatus === 'Rejected' ? `
                                <div class="rejection-reason">
                                    <span class="rejection-icon">⚠️</span>
                                    <span>${vehicle.rejectionReason}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}

                    <!-- Add Vehicle Card -->
                    <div class="vehicle-card add-new" onclick="driverDash.showAddVehicleModal()">
                        <div class="add-vehicle-content">
                            <div class="add-icon">➕</div>
                            <div class="add-text">Add Vehicle</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.initVehicleInteractions();
    }

    renderProfile(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>Driver Profile</h3></div>
                <div class="card-body">
                    <form>
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" class="form-control" value="${this.currentUser.full_name}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" class="form-control" value="${this.currentUser.email}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" class="form-control" value="${this.currentUser.phone_number}" disabled>
                        </div>
                        <div class="form-group">
                            <label>License Number</label>
                            <input type="text" class="form-control" value="${this.driver.license_number}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Availability</label>
                            <input type="text" class="form-control" value="${this.driver.availability_status}" disabled>
                        </div>
                        <div class="form-group">
                            <label>Average Rating</label>
                            <input type="text" class="form-control" value="${this.driver.average_rating} / 5.0" disabled>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    renderSupport(container) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header"><h3>Support</h3></div>
                <div class="card-body">
                    <p class="text-muted">Need assistance? Open a support ticket and our team will follow up.</p>
                    <button class="btn btn-primary" onclick="showToast('Support request sent', 'success')">Contact Support</button>
                </div>
            </div>
        `;
    }

    async acceptRide(rideId) {
        try {
            showToast('Accepting ride...', 'info');
            
            // Get current active vehicle
            const vehicles = this.getDriverVehicles();
            const activeVehicle = vehicles.find(v => v.isActive) || vehicles[0];
            
            await driverAPI.acceptRide(rideId, this.driver.id, activeVehicle.id);
            showToast('Ride accepted!', 'success');
            await this.refreshOverviewData();
            
            // Move to current ride view
            this.renderSection('current-ride');

            // Start automated 60s trip simulation with 15s intervals
            this.startAutomatedTripSimulation(rideId);

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    startAutomatedTripSimulation(rideId) {
        let step = 0;
        showToast('Trip automated simulation started...', 'info');
        
        const simInterval = setInterval(async () => {
            step++;
            try {
                if (step === 1) { // 15s
                    showToast('Driver En Route to Pickup...', 'info');
                    const ride = this.allTrips.find(r => r.id === rideId);
                    if(ride) ride.status = 'Driver En Route';
                    this.renderSection('current-ride');
                } else if (step === 2) { // 30s
                    await apiClient.put(`/rides/${rideId}/start`);
                    showToast('Trip Started & In Progress!', 'info');
                    await this.refreshOverviewData();
                    if (this.section === 'current-ride') this.renderSection('current-ride');
                } else if (step === 3) { // 45s
                    showToast('Approaching Destination...', 'info');
                } else if (step >= 4) { // 60s
                    clearInterval(simInterval);
                    // Get the actual fare from the ride data
                    const ride = this.allTrips.find(r => r.id === rideId);
                    const fare = ride ? (ride.estimated_fare || ride.subtotal || ride.final_fare || 450) : 450;
                    const distKm = ride ? (ride.distance_km || 8.7) : 8.7;
                    await apiClient.put(`/rides/${rideId}/complete`, { final_amount: fare, actual_distance: distKm });
                    showToast('Trip Completed!', 'success');
                    await this.refreshOverviewData();
                    const commission = parseFloat((fare * 0.15).toFixed(2));
                    const net = parseFloat((fare * 0.85).toFixed(2));
                    this.showTripCompletionModal({ distance: distKm, duration: 25, fare, commission, net });
                }
            } catch (error) {
                console.error('Simulation error:', error);
            }
        }, 15000); // 15 second intervals
    }

    renderRideRequests(container) {
        if (!this.isOnline) {
            container.innerHTML = `
                <div class="empty-state" style="padding:40px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">😴</div>
                    <h3>You are currently Offline</h3>
                    <p class="text-muted">Go online to start receiving ride requests from riders in your area.</p>
                    <button class="btn btn-primary" onclick="driverDash.toggleAvailability()" style="margin-top:16px;">Go Online</button>
                </div>
            `;
            return;
        }

        const requests = this.incomingRequests || [];

        container.innerHTML = `
            <div class="ride-requests-layout">
                <div class="section-header" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                    <h2>Available Requests (${requests.length})</h2>
                    <button class="btn btn-sm btn-secondary" onclick="driverDash.refreshOverviewData().then(() => driverDash.renderSection('ride-requests'))">🔄 Refresh</button>
                </div>

                ${requests.length === 0 ? `
                    <div class="card" style="padding:40px; text-align:center; background:var(--rf-surface-2);">
                        <div style="font-size:48px; margin-bottom:16px;">🔍</div>
                        <h3>Searching for rides...</h3>
                        <p class="text-muted">New requests will appear here automatically as they come in.</p>
                    </div>
                ` : `
                    <div class="requests-list" style="display:grid; gap:16px;">
                        ${requests.map(ride => `
                            <div class="card ride-request-card" style="padding:20px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--rf-accent);">
                                <div class="request-info">
                                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                                        <span style="font-weight:700; font-size:18px;">${ride.rider_name || 'Alaxandar'}</span>
                                        <span class="badge badge-primary">${ride.ride_type || 'Regular'}</span>
                                    </div>
                                    <div class="locations" style="font-size:14px; color:var(--rf-text-muted);">
                                        <div>📍 ${this.getRideLocationLabel(ride, 'pickup')}</div>
                                        <div>🏁 ${this.getRideLocationLabel(ride, 'dropoff')}</div>
                                    </div>
                                </div>
                                <div class="request-meta" style="text-align:right;">
                                    <div style="font-size:20px; font-weight:700; color:var(--rf-success); margin-bottom:8px;">PKR ${ride.estimated_fare || 0}</div>
                                    <div class="request-actions" style="display:flex; gap:8px;">
                                        <button class="btn btn-sm btn-secondary" onclick="driverDash.showRequestRoute(${ride.id})">🗺️ Map</button>
                                        <button class="btn btn-sm btn-success" onclick="driverDash.acceptRide(${ride.id})">Accept</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }

    async rejectRide(rideId) {
        try {
            await driverAPI.rejectRide(rideId);
            showToast('Ride rejected', 'info');
            await this.refreshOverviewData();
            this.renderSection(this.section);
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async completeRide(rideId) {
        const ride = mockRides.find(r => r.id === rideId);
        if (!ride) {
            showToast('Ride not found', 'error');
            return;
        }

        Modal.confirm({
            title: 'Complete Ride',
            message: 'Mark this ride as completed?',
            onConfirm: async () => {
                try {
                    await driverAPI.completeRide(ride.id);
                    showToast('Ride completed', 'success');
                    await this.refreshOverviewData();
                    this.renderSection(this.section);
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
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

    getRatingStars(score) {
        if (!score || score < 1) return 'No rating yet';
        return '⭐'.repeat(Math.max(1, Math.min(5, score)));
    }

    getRideRiderName(ride) {
        if (!ride || !ride.rider_id) return 'Unknown';
        const rider = mockUsers.find(u => u.id === ride.rider_id);
        return rider?.full_name || 'Unknown';
    }

    showCurrentRoute() {
        const currentRide = mockRides.find(r => r.driver_id === this.driver.id && r.status === 'In Progress');
        if (!currentRide) {
            showToast('No current ride to display.', 'warning');
            return;
        }

        Modal.alert({
            title: 'Current Route',
            message: `
                <div style="padding: 16px;">
                    <p><strong>Pickup:</strong> ${this.getRideLocationLabel(currentRide, 'pickup')}</p>
                    <p><strong>Dropoff:</strong> ${this.getRideLocationLabel(currentRide, 'dropoff')}</p>
                    <p><strong>Est. Distance:</strong> ${currentRide.distance_km || 5} km</p>
                </div>
            `
        });
    }

    showRequestRoute(rideId) {
        const ride = this.incomingRequests.find(r => r.id === rideId) || mockRides.find(r => r.id === rideId);
        if (!ride) {
            showToast('Ride request not found.', 'error');
            return;
        }

        Modal.alert({
            title: 'Request Route',
            message: `
                <div style="padding: 16px;">
                    <p><strong>Pickup:</strong> ${this.getRideLocationLabel(ride, 'pickup')}</p>
                    <p><strong>Dropoff:</strong> ${this.getRideLocationLabel(ride, 'dropoff')}</p>
                    <p><strong>Est. Distance:</strong> ${ride.distance_km || 5} km</p>
                    <p><strong>Est. Fare:</strong> PKR ${ride.estimated_fare || 300}</p>
                </div>
            `
        });
    }

    // Premium Driver Features
    showEarningsDashboard() {
        const earnings = this.calculateEarningsData();
        Modal.alert({
            title: 'Earnings Dashboard',
            message: `
                <div class="earnings-dashboard">
                    <div class="earnings-summary">
                        <div class="metric">
                            <span class="metric-value">$${earnings.today}</span>
                            <span class="metric-label">Today</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">$${earnings.week}</span>
                            <span class="metric-label">This Week</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">$${earnings.month}</span>
                            <span class="metric-label">This Month</span>
                        </div>
                    </div>
                    <div class="earnings-chart">
                        <canvas id="earnings-chart" width="300" height="150"></canvas>
                    </div>
                    <div class="earnings-breakdown">
                        <h4>Earnings Breakdown</h4>
                        <div class="breakdown-item">
                            <span>Ride fares</span>
                            <span>$${earnings.breakdown.fares}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Tips</span>
                            <span>$${earnings.breakdown.tips}</span>
                        </div>
                        <div class="breakdown-item">
                            <span>Bonuses</span>
                            <span>$${earnings.breakdown.bonuses}</span>
                        </div>
                    </div>
                </div>
            `
        });
    }

    calculateEarningsData() {
        // Mock earnings data
        return {
            today: 127.50,
            week: 892.30,
            month: 3456.78,
            breakdown: {
                fares: 3120.00,
                tips: 256.78,
                bonuses: 80.00
            }
        };
    }

    showDemandHeatmap() {
        Modal.alert({
            title: 'Demand Zones',
            message: `
                <div class="demand-heatmap">
                    <div class="heatmap-legend">
                        <div class="legend-item">
                            <div class="legend-color high"></div>
                            <span>High Demand</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color medium"></div>
                            <span>Medium Demand</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color low"></div>
                            <span>Low Demand</span>
                        </div>
                    </div>
                    <div class="zones-list">
                        ${(mockDemandZones || []).map(zone => `
                            <div class="zone-item ${zone.demand_level.toLowerCase()}">
                                <div class="zone-name">${zone.label}</div>
                                <div class="zone-score">${zone.score}/100</div>
                                <div class="zone-trend ${zone.trend > 0 ? 'up' : 'down'}">
                                    ${zone.trend > 0 ? '↗️' : '↘️'} ${Math.abs(zone.trend)}%
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="heatmap-tip">
                        💡 Position yourself in high-demand zones for more ride requests
                    </div>
                </div>
            `
        });
    }

    showPerformanceInsights() {
        const performance = this.calculatePerformanceMetrics();
        Modal.alert({
            title: 'Performance Insights',
            message: `
                <div class="performance-insights">
                    <div class="performance-metrics">
                        <div class="metric">
                            <span class="metric-value">${performance.rating}⭐</span>
                            <span class="metric-label">Average Rating</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${performance.acceptance}%</span>
                            <span class="metric-label">Acceptance Rate</span>
                        </div>
                        <div class="metric">
                            <span class="metric-value">${performance.completion}%</span>
                            <span class="metric-label">Completion Rate</span>
                        </div>
                    </div>
                    <div class="performance-tips">
                        <h4>💡 Improvement Tips</h4>
                        <ul>
                            ${performance.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `
        });
    }

    calculatePerformanceMetrics() {
        return {
            rating: 4.7,
            acceptance: 92,
            completion: 98,
            tips: [
                'Maintain high acceptance rate to get more requests',
                'Quick response times improve rider satisfaction',
                'Clean vehicle and professional service boost ratings'
            ]
        };
    }

    toggleAvailability() {
        this.isOnline = !this.isOnline;
        const status = this.isOnline ? 'Online' : 'Offline';
        showToast(`You are now ${status}`, this.isOnline ? 'success' : 'info');

        // Update UI
        const toggleBtn = document.querySelector('.availability-toggle');
        if (toggleBtn) {
            toggleBtn.classList.toggle('online', this.isOnline);
            toggleBtn.classList.toggle('offline', !this.isOnline);
            toggleBtn.textContent = this.isOnline ? 'Go Offline' : 'Go Online';
        }
    }

    showNavigationGuidance() {
        if (!this.currentRide) {
            showToast('No active ride to navigate', 'warning');
            return;
        }

        Modal.alert({
            title: 'Navigation Guidance',
            message: `
                <div class="navigation-guidance">
                    <div class="next-step">
                        <h4>Next: ${this.currentRide.current_stage}</h4>
                        <p>${this.getStageDescription(this.currentRide.current_stage)}</p>
                    </div>
                    <div class="route-info">
                        <div class="route-stat">
                            <span>Distance to go:</span>
                            <span>${this.currentRide.remaining_distance}km</span>
                        </div>
                        <div class="route-stat">
                            <span>ETA:</span>
                            <span>${this.currentRide.remaining_eta}min</span>
                        </div>
                    </div>
                    <div class="navigation-actions">
                        <button class="btn btn-primary" onclick="driverDash.recenterMap()">Recenter Map</button>
                        <button class="btn btn-outline" onclick="driverDash.callRider()">Call Rider</button>
                    </div>
                </div>
            `
        });
    }

    getStageDescription(stage) {
        const descriptions = {
            'driver_en_route': 'Head to the pickup location',
            'waiting': 'Wait for the rider to enter the vehicle',
            'in_progress': 'Drive to the destination',
            'completed': 'Trip completed successfully'
        };
        return descriptions[stage] || 'Follow the route guidance';
    }

    recenterMap() {
        if (window.RideFlowMap && RideFlowMap.map && RideFlowMap.userMarker) {
            var latlng = RideFlowMap.userMarker.getLatLng();
            RideFlowMap.map.setView(latlng, 15);
        }
        showToast('Map recentered on your location', 'info');
    }

    callRider() {
        showToast('Calling rider...', 'info');
    }

    // === SECTION 6: renderSchedule() ===
    renderSchedule(container) {
        const scheduleData = this.getScheduleData();

        container.innerHTML = `
            <div class="schedule-layout">
                <!-- Weekly Calendar -->
                <div class="calendar-section">
                    <div class="calendar-header">
                        <h3>Weekly Schedule</h3>
                        <div class="calendar-nav">
                            <button class="nav-btn" onclick="driverDash.prevWeek()">‹</button>
                            <span class="current-week">${scheduleData.weekRange}</span>
                            <button class="nav-btn" onclick="driverDash.nextWeek()">›</button>
                        </div>
                    </div>

                    <div class="calendar-grid">
                        <!-- Time slots header -->
                        <div class="time-header">
                            <div class="day-label">Time</div>
                            ${scheduleData.days.map(day => `
                                <div class="day-header ${day.isToday ? 'today' : ''}">
                                    <div class="day-name">${day.name}</div>
                                    <div class="day-date">${day.date}</div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Time slots -->
                        ${scheduleData.timeSlots.map((timeSlot, index) => `
                            <div class="time-row">
                                <div class="time-label">${timeSlot.label}</div>
                                ${scheduleData.days.map(day => {
                                    const slotData = scheduleData.schedule[day.date]?.[index];
                                    return `
                                        <div class="time-slot ${slotData?.available ? 'available' : 'unavailable'}"
                                             data-day="${day.date}"
                                             data-slot="${index}"
                                             onclick="driverDash.toggleTimeSlot('${day.date}', ${index})">
                                            ${slotData?.ride ? `<div class="slot-ride">${slotData.ride.id}</div>` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Scheduled Rides List -->
                <div class="scheduled-rides-section">
                    <h3>Scheduled Rides</h3>
                    <div class="scheduled-rides-list">
                        ${scheduleData.scheduledRides.map(ride => `
                            <div class="scheduled-ride-item">
                                <div class="ride-time">
                                    <div class="ride-date">${ride.date}</div>
                                    <div class="ride-time-slot">${ride.time}</div>
                                </div>
                                <div class="ride-details">
                                    <div class="ride-area">${ride.area}</div>
                                    <div class="ride-estimate">Est. ${formatCurrency(ride.estimatedEarnings)}</div>
                                </div>
                                <div class="ride-actions">
                                    <button class="btn btn-sm btn-outline" onclick="driverDash.editScheduledRide(${ride.id})">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="driverDash.cancelScheduledRide(${ride.id})">Cancel</button>
                                </div>
                            </div>
                        `).join('')}

                        ${scheduleData.scheduledRides.length === 0 ? `
                            <div class="no-scheduled-rides">
                                <div class="no-rides-icon">📅</div>
                                <p>No scheduled rides this week</p>
                                <button class="btn btn-primary" onclick="driverDash.addScheduledRide()">Add Schedule</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        this.initScheduleInteractions();
    }

    // === SECTION: renderDemandZones() ===
    renderDemandZones(container) {
        const zones = (typeof mockDemandZones !== 'undefined' && mockDemandZones.length)
            ? mockDemandZones
            : [
                { id: 1, name: 'F-10 Markaz', area: 'Islamabad', demand_level: 'High', surge: 1.5, avg_wait: '3 min', rides_last_hour: 18, earnings_potential: 'PKR 800/hr' },
                { id: 2, name: 'Blue Area', area: 'Islamabad', demand_level: 'Very High', surge: 2.0, avg_wait: '2 min', rides_last_hour: 25, earnings_potential: 'PKR 1,200/hr' },
                { id: 3, name: 'Jinnah Super Market', area: 'Islamabad', demand_level: 'Medium', surge: 1.2, avg_wait: '5 min', rides_last_hour: 10, earnings_potential: 'PKR 600/hr' },
                { id: 4, name: 'G-9 Markaz', area: 'Islamabad', demand_level: 'Low', surge: 1.0, avg_wait: '8 min', rides_last_hour: 4, earnings_potential: 'PKR 400/hr' },
                { id: 5, name: 'I-8 Markaz', area: 'Islamabad', demand_level: 'Medium', surge: 1.3, avg_wait: '5 min', rides_last_hour: 9, earnings_potential: 'PKR 550/hr' },
                { id: 6, name: 'F-6 Super Market', area: 'Islamabad', demand_level: 'High', surge: 1.6, avg_wait: '3 min', rides_last_hour: 16, earnings_potential: 'PKR 900/hr' },
                { id: 7, name: 'F-8 Markaz', area: 'Islamabad', demand_level: 'Medium', surge: 1.1, avg_wait: '6 min', rides_last_hour: 7, earnings_potential: 'PKR 500/hr' },
                { id: 8, name: 'G-11 Markaz', area: 'Islamabad', demand_level: 'Low', surge: 1.0, avg_wait: '9 min', rides_last_hour: 3, earnings_potential: 'PKR 350/hr' }
            ];

        const levelColor = { 'Very High': '#dc2626', 'High': '#f59e0b', 'Medium': '#2563eb', 'Low': '#6b7280' };
        const levelBg = { 'Very High': '#fef2f2', 'High': '#fffbeb', 'Medium': '#eff6ff', 'Low': '#f9fafb' };

        container.innerHTML = `
            <div class="demand-zones-layout" style="display:flex;flex-direction:column;gap:20px;">
                <div class="card">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <h3>🔥 Islamabad Demand Zones</h3>
                        <span class="text-muted" style="font-size:13px;">Updated just now</span>
                    </div>
                    <div class="card-body">
                        <p class="text-muted" style="margin-bottom:16px;">High-demand areas where you can earn more with surge pricing. Head to a hot zone to maximize earnings.</p>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
                            ${zones.map(zone => `
                                <div class="card" style="border-left:4px solid ${levelColor[zone.demand_level] || '#6b7280'};background:${levelBg[zone.demand_level] || '#f9fafb'};padding:16px;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                        <div style="font-weight:700;font-size:16px;">${zone.name}</div>
                                        <span style="background:${levelColor[zone.demand_level]};color:white;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${zone.demand_level}</span>
                                    </div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                                        <div><span class="text-muted">Surge:</span> <strong style="color:${zone.surge > 1 ? '#dc2626' : '#16a34a'};">${zone.surge}x</strong></div>
                                        <div><span class="text-muted">Wait:</span> <strong>${zone.avg_wait}</strong></div>
                                        <div><span class="text-muted">Rides/hr:</span> <strong>${zone.rides_last_hour}</strong></div>
                                        <div><span class="text-muted">Earn/hr:</span> <strong style="color:var(--rf-driver-primary, #059669);">${zone.earnings_potential}</strong></div>
                                    </div>
                                    <button class="btn btn-sm btn-primary" style="margin-top:12px;width:100%;" onclick="showToast('Navigating to ${zone.name}...', 'info')">📍 Navigate There</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Demand Heatmap Legend -->
                <div class="card">
                    <div class="card-header"><h3>📊 Demand Legend</h3></div>
                    <div class="card-body" style="display:flex;gap:16px;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#dc2626;"></div> Very High (2x+ surge)</div>
                        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#f59e0b;"></div> High (1.5x surge)</div>
                        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#2563eb;"></div> Medium (1.1–1.3x)</div>
                        <div style="display:flex;align-items:center;gap:6px;"><div style="width:14px;height:14px;border-radius:3px;background:#6b7280;"></div> Low (1x base)</div>
                    </div>
                </div>
            </div>
        `;
    }

    // === SUPPORTING METHODS ===

    getTodayStats() {
        const today = new Date().toDateString();
        const todayRides = this.allTrips.filter(ride =>
            new Date(ride.created_at).toDateString() === today &&
            ride.status === 'Completed'
        );

        const earnings = todayRides.reduce((sum, ride) => sum + (parseFloat(ride.final_fare) || 0), 0);
        const trips = todayRides.length;
        const hours = 0; // Real hours not tracked yet
        const acceptanceRate = 100; // Mock or calculate if needed
        const rating = this.driver?.average_rating || 'N/A';
        const ratingTrend = 0;

        return {
            earnings,
            trips,
            hours,
            acceptanceRate,
            rating,
            ratingTrend
        };
    }

    initHomeMap() {
        var self = this;

        setTimeout(function () {
            if (!window.RideFlowMap) return;

            RideFlowMap.destroyMap();
            RideFlowMap.initDriverMap('driver-home-map');

            // Start live GPS tracking
            RideFlowMap.startLiveTracking(function (lat, lng) {
                // Driver position updated automatically via blue dot
            });
        }, 150);
    }

    initOnlineToggle() {
        const toggleBtn = document.getElementById('online-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isOnline = !this.isOnline;
                this.updateOnlineStatus();
            });
        }
    }

    updateOnlineStatus() {
        const toggleBtn = document.getElementById('online-toggle-btn');
        const offlineBanner = document.getElementById('offline-banner');

        if (this.isOnline) {
            toggleBtn.classList.remove('offline');
            toggleBtn.classList.add('online');
            toggleBtn.innerHTML = '<span class="toggle-icon">🟢</span><span class="toggle-text">Go Offline</span>';
            if (offlineBanner) offlineBanner.style.display = 'none';

            // Start showing incoming requests
            this.startRequestSimulation();
        } else {
            toggleBtn.classList.remove('online');
            toggleBtn.classList.add('offline');
            toggleBtn.innerHTML = '<span class="toggle-icon">🔴</span><span class="toggle-text">Go Online</span>';
            if (offlineBanner) offlineBanner.style.display = 'block';

            // Stop showing requests
            this.stopRequestSimulation();
        }
    }

    showRideRequest(ride) {
        if (!this.isOnline || !ride) return;

        const panel = document.getElementById('incoming-request-panel');
        if (panel) {
            // Update UI with real data
            const riderNameEl = panel.querySelector('.rider-name');
            const fareEl = panel.querySelector('.estimated-earnings');
            const pickupEl = panel.querySelector('.pickup-distance');
            
            if (riderNameEl) riderNameEl.textContent = ride.rider_name || 'Alaxandar';
            if (fareEl) fareEl.textContent = `💰 Est. PKR ${ride.estimated_fare || ride.fare || 450}`;
            if (pickupEl) pickupEl.textContent = `📍 Nearby (${ride.ride_type || 'Regular'})`;

            // Store the active ride ID on the panel for the buttons to use
            panel.dataset.activeRideId = ride.id;

            panel.style.display = 'block';
            panel.style.animation = 'slideUp 0.5s ease-out';

            // Play sound cue
            this.playNotificationSound();

            // Start countdown
            this.startCountdown();
        }
    }

    simulateIncomingRequest() {
        // This is now handled by polling in _startWatchingForRides
        // But we keep it as a fallback for demo if needed
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Fallback: no sound
        }
    }

    startCountdown() {
        let timeLeft = 15;
        const countdownText = document.getElementById('countdown-text');
        const countdownCircle = document.getElementById('countdown-circle');

        const interval = setInterval(() => {
            timeLeft--;
            if (countdownText) countdownText.textContent = timeLeft;

            const progress = (15 - timeLeft) / 15;
            const dashOffset = 2 * Math.PI * 25 * progress;
            if (countdownCircle) {
                countdownCircle.setAttribute('stroke-dashoffset', dashOffset);
            }

            if (timeLeft <= 0) {
                clearInterval(interval);
                this.autoDeclineRequest();
            }
        }, 1000);

        // Setup accept/decline buttons
        const acceptBtn = document.getElementById('accept-ride-btn');
        const declineBtn = document.getElementById('decline-ride-btn');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                clearInterval(interval);
                this.acceptIncomingRequest();
            });
        }

        if (declineBtn) {
            declineBtn.addEventListener('click', () => {
                clearInterval(interval);
                this.declineIncomingRequest();
            });
        }
    }

    async acceptIncomingRequest() {
        const panel = document.getElementById('incoming-request-panel');
        const rideId = panel ? panel.dataset.activeRideId : null;

        if (panel) {
            panel.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => panel.style.display = 'none', 300);
        }

        if (rideId) {
            try {
                await this.acceptRide(rideId);
            } catch (error) {
                showToast('Failed to accept ride: ' + error.message, 'error');
            }
        } else {
            showToast('Ride accepted! Starting trip...', 'success');
            setTimeout(() => this.renderSection('current-ride'), 1000);
        }
    }

    declineIncomingRequest() {
        const panel = document.getElementById('incoming-request-panel');
        if (panel) {
            panel.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                panel.style.animation = 'slideDown 0.3s ease-in';
                setTimeout(() => panel.style.display = 'none', 300);
            }, 500);
        }

        showToast('Ride declined', 'info');
    }

    autoDeclineRequest() {
        const panel = document.getElementById('incoming-request-panel');
        if (panel) {
            panel.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                panel.style.animation = 'slideDown 0.3s ease-in';
                setTimeout(() => panel.style.display = 'none', 300);
            }, 500);
        }

        showToast('Ride request expired', 'warning');
    }

    startRequestSimulation() {
        this.requestInterval = setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance every interval
                this.simulateIncomingRequest();
            }
        }, 30000); // Every 30 seconds
    }

    stopRequestSimulation() {
        if (this.requestInterval) {
            clearInterval(this.requestInterval);
            this.requestInterval = null;
        }
    }

    initActiveTrip() {
        var self = this;

        // Setup ETA toggles
        this.setupETAToggles();

        // Start live counters
        this.startTripCounters();

        // Setup status button
        this.setupStatusButton();

        // Wire simulate driver movement button
        var simBtn = document.getElementById('simulate-driver-btn');
        if (simBtn) {
            simBtn.addEventListener('click', function () {
                if (window.RideFlowMap && RideFlowMap.routePath) {
                    RideFlowMap.simulateDriverMovement(
                        function (step, total) {
                            var pct = Math.round((step / total) * 100);
                            var etaEl = document.getElementById('driver-eta-pickup');
                            if (etaEl) etaEl.textContent = Math.max(1, Math.round((100 - pct) / 10)) + ' min';
                        },
                        function () {
                            showToast('Driver has arrived', 'success');
                        }
                    );
                } else {
                    showToast('No route loaded to simulate', 'warning');
                }
            });
        }

        // Initialize live map with driver route
        setTimeout(function () {
            if (!window.RideFlowMap) return;

            RideFlowMap.destroyMap();
            RideFlowMap.initDriverMap('driver-map-container');

            // Set mock markers for demo: driver at G-9, pickup at Centaurus, dropoff at Blue Area
            RideFlowMap.setPickupMarker(33.7156, 73.0670, 'Pickup: Centaurus Mall');
            RideFlowMap.setDropoffMarker(33.7238, 73.0879, 'Destination: Blue Area');

            // Draw route from driver position (G-9) to pickup (Centaurus)
            RideFlowMap.drawRoute(33.6844, 73.0479, 33.7156, 73.0670, function (result) {
                var etaEl = document.getElementById('driver-eta-pickup');
                var distEl = document.getElementById('driver-trip-distance');
                if (etaEl) etaEl.textContent = result.duration + ' min';
                if (distEl) distEl.textContent = result.distance + ' km';
            });

            // Start live GPS tracking for the driver
            RideFlowMap.startLiveTracking(function (lat, lng) {
                // Auto-recalculate route from driver's new GPS position to pickup
                if (RideFlowMap.pickupMarker) {
                    var pickup = RideFlowMap.pickupMarker.getLatLng();
                    RideFlowMap.drawRoute(lat, lng, pickup.lat, pickup.lng, function (result) {
                        var etaEl = document.getElementById('driver-eta-pickup');
                        var distEl = document.getElementById('driver-trip-distance');
                        if (etaEl) etaEl.textContent = result.duration + ' min';
                        if (distEl) distEl.textContent = result.distance + ' km';
                    });
                }
            });
        }, 150);
    }

    setupETAToggles() {
        const toggles = document.querySelectorAll('.eta-btn');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggles.forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');
            });
        });
    }

    startTripCounters() {
        let distance = 0;
        let duration = 0;
        let fare = 0;

        const distanceEl = document.getElementById('distance-counter');
        const durationEl = document.getElementById('duration-counter');
        const fareEl = document.getElementById('fare-counter');

        this.tripInterval = setInterval(() => {
            distance += 0.1;
            duration += 1;
            fare += 5; // Mock fare increment

            if (distanceEl) distanceEl.textContent = `${distance.toFixed(1)} km`;
            if (durationEl) durationEl.textContent = this.formatDuration(duration);
            if (fareEl) fareEl.textContent = `PKR ${fare}`;
        }, 1000);
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setupStatusButton() {
        const statusBtn = document.getElementById('status-action-btn');
        if (statusBtn) {
            statusBtn.addEventListener('click', () => {
                const currentText = statusBtn.querySelector('.btn-text').textContent;

                if (currentText === 'Arrived at Pickup') {
                    statusBtn.querySelector('.btn-text').textContent = 'Start Trip';
                    showToast('Arrived at pickup location', 'success');
                } else if (currentText === 'Start Trip') {
                    statusBtn.querySelector('.btn-text').textContent = 'Complete Trip';
                    showToast('Trip started', 'success');
                } else if (currentText === 'Complete Trip') {
                    this.showTripCompletionModal();
                }
            });
        }
    }

    showTripCompletionModal(tripSummary) {
        if (!tripSummary) {
            tripSummary = {
                distance: 8.7,
                duration: 25,
                fare: 450,
                commission: 67.5,
                net: 382.5
            };
        }

        Modal.alert({
            title: 'Complete Trip',
            message: `
                <div class="trip-completion-modal">
                    <div class="trip-summary">
                        <h4>Trip Summary</h4>
                        <div class="summary-row"><span>Distance:</span><span>${tripSummary.distance} km</span></div>
                        <div class="summary-row"><span>Duration:</span><span>${tripSummary.duration} min</span></div>
                        <div class="summary-row"><span>Fare:</span><span>${formatCurrency(tripSummary.fare)}</span></div>
                        <div class="summary-row"><span>Commission (15%):</span><span>${formatCurrency(tripSummary.commission)}</span></div>
                        <div class="summary-row total"><span>Net Earnings:</span><span>${formatCurrency(tripSummary.net)}</span></div>
                    </div>

                    <div class="payment-section">
                        <label class="checkbox-label">
                            <input type="checkbox" id="cash-payment-confirm"> Cash payment received
                        </label>
                    </div>

                    <div class="rating-section">
                        <h4>Rate Your Rider</h4>
                        <div class="stars-container">
                            ${[1,2,3,4,5].map(star => `<span class="star" data-rating="${star}">⭐</span>`).join('')}
                        </div>
                        <textarea id="rider-comment" placeholder="Optional comment..." rows="3"></textarea>
                    </div>
                </div>
            `,
            onOpen: () => {
                // Setup star rating
                const stars = document.querySelectorAll('.stars-container .star');
                stars.forEach(star => {
                    star.addEventListener('click', () => {
                        const rating = parseInt(star.dataset.rating);
                        stars.forEach((s, i) => {
                            s.classList.toggle('active', i < rating);
                        });
                    });
                });
            },
            buttons: [
                { text: 'Done', class: 'btn-primary', action: () => {
                    const rating = document.querySelectorAll('.stars-container .star.active').length;
                    const comment = document.getElementById('rider-comment').value;

                    showToast('Trip completed! Earnings updated.', 'success');
                    Modal.close();

                    // Clear trip interval
                    if (this.tripInterval) {
                        clearInterval(this.tripInterval);
                        this.tripInterval = null;
                    }

                    // Return to home
                    setTimeout(() => this.renderSection('overview'), 1000);
                }}
            ]
        });
    }

    getEarningsData(period = 'today') {
        // Always use real completed trips from allTrips if available
        const completedTrips = (this.allTrips || []).filter(t => t.status === 'Completed');

        if (completedTrips.length > 0 || (this.earnings && !Array.isArray(this.earnings))) {
            // Calculate totals from real data
            const recentTrips = completedTrips.slice(0, 10).map(t => {
                const fare = parseFloat(t.final_fare || t.estimated_fare || t.subtotal || 0);
                const net = parseFloat(t.driver_net_earning || (fare * 0.85).toFixed(2));
                const commission = parseFloat((fare - net).toFixed(2));
                return {
                    id: t.id,
                    rider: t.rider_name || 'Rider',
                    fare,
                    commission,
                    net
                };
            });

            // Use API earnings summary if available, otherwise calculate from trips
            const apiTotal = this.earnings && !Array.isArray(this.earnings) ? (this.earnings.total || 0) : null;
            const calcTotal = recentTrips.reduce((sum, t) => sum + t.net, 0);
            const total = apiTotal !== null ? apiTotal : calcTotal;
            const trips = (this.earnings && this.earnings.ride_count) || completedTrips.length;
            const average = trips > 0 ? parseFloat((total / trips).toFixed(2)) : 0;

            return {
                total,
                trips,
                average,
                available: total,
                recentTrips,
                payoutHistory: []
            };
        }

        // Fallback mock data (used only when no real data exists yet)
        const mockData = {
            today: {
                total: 0,
                trips: 0,
                average: 0,
                available: 0,
                recentTrips: [],
                payoutHistory: []
            }
        };

        return mockData[period] || mockData.today;
    }


    getEarningsChartData() {
        return [120, 150, 180, 140, 200, 250, 220]; // Mock 7-day data for chart
    }

    renderEarningsChart(data) {
        const maxValue = Math.max(...data);
        const chartWidth = 700;
        const chartHeight = 200;
        const barWidth = chartWidth / data.length - 10;

        return data.map((value, index) => {
            const barHeight = (value / maxValue) * (chartHeight - 40);
            const x = index * (chartWidth / data.length) + 5;
            const y = chartHeight - barHeight - 20;

            return `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
                      fill="var(--rf-driver-primary)" rx="4"
                      onmouseover="driverDash.showChartTooltip(${index}, ${value}, event)"
                      onmouseout="driverDash.hideChartTooltip()"/>
            `;
        }).join('');
    }

    showChartTooltip(index, value, event) {
        // Implementation for chart tooltip
    }

    hideChartTooltip() {
        // Implementation for hiding tooltip
    }

    initEarningsInteractions() {
        const periodBtns = document.querySelectorAll('.period-btn');
        periodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                periodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Reload data for selected period
            });
        });
    }

    getDriverVehicles() {
        return [
            {
                id: 1,
                make: 'Toyota',
                model: 'Corolla',
                type: 'Economy',
                licensePlate: 'ABC-123',
                verificationStatus: 'Verified',
                isActive: true,
                photo: null
            },
            {
                id: 2,
                make: 'Honda',
                model: 'Civic',
                type: 'Premium',
                licensePlate: 'XYZ-789',
                verificationStatus: 'Pending',
                isActive: false,
                photo: null
            }
        ];
    }

    initVehicleInteractions() {
        const select = document.getElementById('active-vehicle-select');
        if (select) {
            select.addEventListener('change', (e) => {
                // Handle vehicle switching
                showToast('Active vehicle updated', 'success');
            });
        }
    }

    getPerformanceData() {
        if (this.driver) {
            return {
                overallRating: this.driver.average_rating || 0,
                totalRatings: this.driver.total_trips || 0, // Using trips as proxy for ratings if not separated
                ratingTrend: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
                currentAcceptanceRate: 100,
                acceptanceChange: 0,
                acceptanceHistory: [100, 100, 100],
                badges: [
                    { name: '100 Trips', icon: '🏆', unlocked: (this.driver.total_trips >= 100) },
                    { name: 'Top Rated', icon: '⭐', unlocked: (this.driver.average_rating >= 4.5) },
                    { name: 'Veteran Driver', icon: '🎖️', unlocked: false, progress: Math.min(100, this.driver.total_trips), current: this.driver.total_trips, target: 100 }
                ],
                recentFeedback: [],
                leaderboardRank: '-',
                monthlyTrips: this.driver.total_trips || 0
            };
        }
        
        // Fallback mock data
        return {
            overallRating: 4.7,
            totalRatings: 127,
            ratingTrend: 0.2,
            ratingDistribution: { 5: 89, 4: 28, 3: 8, 2: 2, 1: 0 },
            currentAcceptanceRate: 92,
            acceptanceChange: 3,
            acceptanceHistory: [85, 87, 89, 91, 88, 90, 92, 94, 91, 93, 90, 92, 89, 91, 92],
            badges: [
                { name: '100 Trips', icon: '🏆', unlocked: true },
                { name: 'Top Rated', icon: '⭐', unlocked: true },
                { name: 'Veteran Driver', icon: '🎖️', unlocked: false, progress: 75, current: 75, target: 100 }
            ],
            recentFeedback: [
                { rating: 5, comment: 'Great service! Very professional driver.', date: '2 days ago' },
                { rating: 4, comment: 'Good ride, but took a longer route.', date: '1 week ago' },
                { rating: 5, comment: 'Excellent driving and very courteous.', date: '2 weeks ago' }
            ],
            leaderboardRank: 15,
            monthlyTrips: 47
        };
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return '⭐'.repeat(fullStars) +
               (hasHalfStar ? '⭐' : '') +
               '☆'.repeat(emptyStars);
    }

    renderAcceptanceSparkline(data) {
        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * 300;
            const y = 60 - (value / 100) * 50;
            return `${x},${y}`;
        }).join(' ');

        return `<polyline fill="none" stroke="var(--rf-driver-primary)" stroke-width="2" points="${points}"/>`;
    }

    getScheduleData() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push({
                name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: date.toISOString().split('T')[0],
                isToday: date.toDateString() === today.toDateString()
            });
        }

        const timeSlots = [];
        for (let hour = 6; hour <= 22; hour++) {
            timeSlots.push({
                label: `${hour.toString().padStart(2, '0')}:00`,
                hour
            });
        }

        return {
            weekRange: `${days[0].name} ${days[0].date.split('-')[2]} - ${days[6].name} ${days[6].date.split('-')[2]}`,
            days,
            timeSlots,
            schedule: {}, // Mock schedule data
            scheduledRides: [
                { id: 1, date: '2024-01-20', time: '14:00', area: 'Gulshan', estimatedEarnings: 450 },
                { id: 2, date: '2024-01-21', time: '16:30', area: 'Clifton', estimatedEarnings: 380 }
            ]
        };
    }

    initScheduleInteractions() {
        // Initialize schedule interactions
    }

    goHome() {
        this.renderSection('overview');
    }

    viewEarnings() {
        this.renderSection('earnings');
    }

    viewSchedule() {
        this.renderSection('schedule');
    }

    viewPerformance() {
        this.renderSection('performance');
    }

    emergencyStop() {
        Modal.confirm({
            title: 'Emergency Stop',
            message: 'Are you sure you want to emergency stop this trip? This will cancel the ride and may affect your rating.',
            onConfirm: () => {
                showToast('Emergency stop activated', 'warning');
                // Handle emergency stop logic
            }
        });
    }

    callRider() {
        showToast('Calling rider...', 'info');
    }

    copyAddress(address) {
        navigator.clipboard.writeText(address).then(() => {
            showToast('Address copied to clipboard', 'success');
        });
    }

    showPayoutForm() {
        const form = document.getElementById('payout-form');
        if (form) form.style.display = 'block';
    }

    cancelPayout() {
        const form = document.getElementById('payout-form');
        if (form) form.style.display = 'none';
    }

    submitPayout() {
        const accountNumber = document.getElementById('account-number').value;
        const bankName = document.getElementById('bank-name').value;
        const amount = parseFloat(document.getElementById('withdraw-amount').value);

        if (!accountNumber || !bankName || !amount) {
            showToast('Please fill all fields', 'error');
            return;
        }

        showToast('Payout request submitted successfully', 'success');
        this.cancelPayout();
        // Refresh earnings data
        setTimeout(() => this.renderSection('earnings'), 1000);
    }

    showAddVehicleModal() {
        Modal.alert({
            title: 'Add New Vehicle',
            message: `
                <form id="add-vehicle-form" class="add-vehicle-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Make</label>
                            <input type="text" class="form-control" id="vehicle-make" required>
                        </div>
                        <div class="form-group">
                            <label>Model</label>
                            <input type="text" class="form-control" id="vehicle-model" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>License Plate</label>
                            <input type="text" class="form-control" id="vehicle-plate" required>
                        </div>
                        <div class="form-group">
                            <label>Type</label>
                            <select class="form-control" id="vehicle-type" required>
                                <option value="economy">Economy</option>
                                <option value="premium">Premium</option>
                                <option value="luxury">Luxury</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Vehicle Photo</label>
                        <input type="file" class="form-control" id="vehicle-photo" accept="image/*">
                        <div id="photo-preview" class="photo-preview"></div>
                    </div>
                </form>
            `,
            buttons: [
                { text: 'Cancel', class: 'btn-secondary' },
                { text: 'Add Vehicle', class: 'btn-primary', action: () => {
                    // Handle form submission
                    showToast('Vehicle added successfully! Verification pending.', 'success');
                    Modal.close();
                    setTimeout(() => this.renderSection('vehicles'), 1000);
                }}
            ]
        });
    }

    toggleTimeSlot(date, slotIndex) {
        // Handle time slot toggling
        showToast('Schedule updated', 'success');
    }

    prevWeek() {
        // Handle previous week navigation
    }

    nextWeek() {
        // Handle next week navigation
    }

    editScheduledRide(id) {
        showToast('Edit scheduled ride functionality', 'info');
    }

    cancelScheduledRide(id) {
        Modal.confirm({
            title: 'Cancel Scheduled Ride',
            message: 'Are you sure you want to cancel this scheduled ride?',
            onConfirm: () => {
                showToast('Scheduled ride cancelled', 'success');
                setTimeout(() => this.renderSection('schedule'), 1000);
            }
        });
    }

    addScheduledRide() {
        showToast('Add scheduled ride functionality', 'info');
    }

    // ═══════════════════════════════════════════════════════════════
    // RIDE STATE WATCHING — Driver automatically sees incoming rides
    // ═══════════════════════════════════════════════════════════════

    _startWatchingForRides() {
        if (this._rideUnsubscribe) { clearInterval(this._rideUnsubscribe); }
        
        // Use polling instead of window.RideState for production
        this._rideUnsubscribe = setInterval(async () => {
            if (!this.isOnline || !this.driver) return;
            
            try {
                const response = await driverAPI.getIncomingRides(this.driver.id);
                const newRequests = response.data || [];
                
                if (newRequests.length > 0 && (!this.incomingRequests || newRequests.length > this.incomingRequests.length)) {
                    // New ride found!
                    const latestRide = newRequests[0];
                    this.incomingRequests = newRequests;
                    this._showIncomingRidePopup(latestRide);
                }
                
                this.incomingRequests = newRequests;
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 5000);
    }

    _showIncomingRidePopup(ride) {
        const panel = document.getElementById('incoming-request-panel');
        if (!panel) return;

        // Update panel data
        const nameEl = document.getElementById('incoming-rider-name');
        const fareEl = document.getElementById('incoming-est-fare');
        const distEl = document.getElementById('incoming-pickup-dist');

        if (nameEl) nameEl.textContent = ride.rider_name || 'Alaxandar';
        if (fareEl) fareEl.textContent = `💰 Est. PKR ${ride.estimated_fare || 0}`;
        if (distEl) distEl.textContent = `📍 ${ride.distance || 0} km away`;

        panel.dataset.activeRideId = ride.id;
        panel.style.display = 'block';
        panel.style.animation = 'slideUp 0.5s ease-out';

        this.playNotificationSound();
        this.startCountdown();
    }
}

const driverDash = new DriverDashboard();
window.driverDash = driverDash;

// === SHARED DRIVER UTILITIES ===

// MinHeap for ride priority queue
class DriverMinHeap {
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

// Haversine function for distance calculation
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// EarningsCalculator
class EarningsCalculator {
    calculate(distanceKm, durationMin, vehicleType, surgeMultiplier = 1, promoDiscount = 0) {
        const baseRates = {
            'economy': { base: 50, perKm: 15, perMin: 8 },
            'premium': { base: 80, perKm: 25, perMin: 12 },
            'luxury': { base: 120, perKm: 35, perMin: 18 }
        };

        const rates = baseRates[vehicleType] || baseRates.economy;

        const baseFare = rates.base;
        const distanceFare = distanceKm * rates.perKm;
        const timeFare = durationMin * rates.perMin;
        const surgeFare = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1);
        const subtotal = baseFare + distanceFare + timeFare + surgeFare;
        const discount = promoDiscount;
        const total = Math.max(0, subtotal - discount);
        const commission = total * 0.15;
        const net = total - commission;

        return {
            baseFare,
            distanceFare,
            timeFare,
            surgeFare,
            discount,
            total,
            commission,
            net
        };
    }
}
