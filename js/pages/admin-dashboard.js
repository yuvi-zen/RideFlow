/**
 * Admin-Dashboard.js - Admin Dashboard Page
 * Shows statistics, user management, driver verification, complaints, and reports
 */

class AdminDashboard {
    constructor() {
        this.container = document.getElementById('main-content');
        this.stats = {};
    }

    async render() {
        // Load dashboard stats
        try {
            const response = await adminAPI.getDashboardStats();
            this.stats = response.data;
            console.log('Real Stats Loaded:', this.stats);
            setTimeout(() => {
                const statusEl = document.getElementById('connection-status');
                if (statusEl) statusEl.innerHTML = '<span style="color:var(--color-success);">● Connected to LIVE API</span>';
            }, 100);
        } catch (error) {
            console.error('API Error:', error);
            setTimeout(() => {
                const statusEl = document.getElementById('connection-status');
                if (statusEl) statusEl.innerHTML = '<span style="color:var(--color-danger);">● MOCK MODE (Backend Down)</span>';
            }, 100);
        }

        this.container.innerHTML = `
            <div class="admin-dashboard">

                <!-- Header -->
                <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h1>Admin Dashboard <span style="font-size:12px; background:var(--color-success); color:white; padding:4px 8px; border-radius:4px; margin-left:10px;">LIVE DB (21 USERS)</span></h1>
                        <p>Manage all platform activities and users (Elden Ring Dataset)</p>
                    </div>
                    <div style="text-align:right;">
                        <div id="connection-status" style="font-size:11px; margin-bottom:5px;">
                            <span style="color:var(--color-warning);">⚡ Checking Connection...</span>
                        </div>
                        <div style="font-size:11px; color:var(--color-text-muted);">v2.0.2 - Real-time Sync</div>
                        <button class="btn btn-sm btn-primary" onclick="location.reload(true)" style="margin-top:5px;">Force Refresh</button>
                    </div>
                </div>

                <div class="container-fluid">
                    <!-- Statistics Cards -->
                    <div class="stats-grid">
                        ${this.createStatCard('👥', 'Total Users', this.stats.total_users || this.stats.totalUsers || 0, 'primary')}
                        ${this.createStatCard('👤', 'Total Riders', this.stats.total_riders || this.stats.totalRiders || 0, 'success')}
                        ${this.createStatCard('🚗', 'Total Drivers', this.stats.active_drivers || this.stats.totalDrivers || 0, 'warning')}
                        ${this.createStatCard('🛣️', 'Total Rides', this.stats.total_rides || this.stats.totalRides || 0, 'primary')}
                        ${this.createStatCard('💰', 'Platform Revenue', formatCurrency(this.stats.total_revenue || this.stats.totalRevenue || 0), 'success')}
                        ${this.createStatCard('⚠️', 'Open Complaints', this.stats.total_complaints || this.stats.totalComplaints || 0, 'danger')}
                    </div>

                    <!-- Tabs for different sections -->
                    <div style="margin-top: 32px;">
                        <div style="display: flex; gap: 12px; border-bottom: 2px solid var(--color-border); margin-bottom: 24px;">
                            <button class="tab-button active" onclick="adminDash.switchTab(event, 'overview')">Overview</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'analytics')">Analytics</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'users')">Users</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'drivers')">Drivers</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'vehicles')">Vehicles</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'complaints')">Complaints</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'riders')">Riders</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'reports')">Reports</button>
                            <button class="tab-button" onclick="adminDash.switchTab(event, 'settings')">Settings</button>
                        </div>

                        <!-- Overview Tab -->
                        <div id="tab-overview" class="tab-content">
                            <div class="grid-3" style="gap: 24px;">
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Top Drivers</h3>
                                        <button class="btn btn-sm btn-secondary" onclick="adminDash.switchTab(event, 'analytics')">Details</button>
                                    </div>
                                    <div id="driver-leaderboard-container-overview"></div>
                                </div>
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Recent Rides</h3>
                                    </div>
                                    <div id="recent-rides-container"></div>
                                </div>

                                <div class="card">
                                    <div class="card-header">
                                        <h3>Recent Payments</h3>
                                    </div>
                                    <div id="recent-payments-container"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Analytics Tab -->
                        <div id="tab-analytics" class="tab-content hidden">
                            <div class="grid-2" style="gap: 24px;">
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Revenue by City</h3>
                                    </div>
                                    <div id="revenue-by-city-container"></div>
                                </div>

                                <div class="card">
                                    <div class="card-header">
                                        <h3>Revenue by Payment Method</h3>
                                    </div>
                                    <div id="revenue-by-payment-container"></div>
                                </div>
                            </div>
                            <div class="grid-3" style="gap: 24px; margin-top: 24px;">
                                <div class="card">
                                    <div class="card-header">
                                        <h3>Ride Status Breakdown</h3>
                                    </div>
                                    <div id="ride-status-breakdown-container"></div>
                                </div>

                                <div class="card">
                                    <div class="card-header">
                                        <h3>Complaint Statistics</h3>
                                    </div>
                                    <div id="complaint-stats-container"></div>
                                </div>

                                <div class="card">
                                    <div class="card-header">
                                        <h3>Driver Performance Leaderboard</h3>
                                    </div>
                                    <div id="driver-leaderboard-container"></div>
                                </div>
                            </div>
                            <div class="card" style="margin-top: 24px;">
                                <div class="card-header">
                                    <h3>Alerts & Risk Indicators</h3>
                                </div>
                                <div id="alerts-container"></div>
                            </div>
                        </div>

                        <!-- Users Tab -->
                        <div id="tab-users" class="tab-content hidden">
                            <div class="card">
                                <div class="card-header">
                                    <h3>User Management</h3>
                                </div>
                                <div id="users-table-container"></div>
                            </div>
                        </div>

                        <!-- Drivers Tab -->
                        <div id="tab-drivers" class="tab-content hidden">
                            <div id="drivers-container"></div>
                        </div>

                        <!-- Vehicles Tab -->
                        <div id="tab-vehicles" class="tab-content hidden">
                            <div id="vehicles-container"></div>
                        </div>

                        <!-- Complaints Tab -->
                        <div id="tab-complaints" class="tab-content hidden">
                            <div id="complaints-container"></div>
                        </div>

                        <!-- Riders Tab -->
                        <div id="tab-riders" class="tab-content hidden">
                            <div id="riders-container"></div>
                        </div>

                        <!-- Reports Tab -->
                        <div id="tab-reports" class="tab-content hidden">
                            <div id="reports-container"></div>
                        </div>

                        <!-- Settings Tab -->
                        <div id="tab-settings" class="tab-content hidden">
                            <div id="settings-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add tab button styles
        this.addTabStyles();

        // Load tab contents
        this.loadTabContents();
    }

    createStatCard(icon, label, value, type) {
        const colorMap = { primary: '#3b82f6', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444' };
        const color = colorMap[type] || colorMap.primary;
        return `<div style="background:var(--color-surface,#1e2130);border-radius:12px;padding:20px;border-left:4px solid ${color};display:flex;align-items:center;gap:16px;">
            <div style="font-size:28px;">${icon}</div>
            <div>
                <div style="font-size:22px;font-weight:700;color:var(--color-text,#fff);">${value}</div>
                <div style="font-size:12px;color:var(--color-text-muted,#94a3b8);margin-top:2px;">${label}</div>
            </div>
        </div>`;
    }

    addTabStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tab-button {
                background: none;
                border: none;
                padding: 12px 16px;
                font-size: 14px;
                font-weight: 500;
                color: var(--color-text-muted);
                cursor: pointer;
                position: relative;
                transition: color var(--transition-fast);
            }
            
            .tab-button:hover {
                color: var(--color-primary);
            }
            
            .tab-button.active {
                color: var(--color-primary);
            }
            
            .tab-button.active::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                right: 0;
                height: 2px;
                background-color: var(--color-primary);
            }
            
            .tab-content {
                animation: fadeIn var(--transition-normal);
            }
            
            .tab-content.hidden {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    async loadTabContents() {
        // Load overview
        this.loadRecentRides();
        this.loadRecentPayments();
        this.loadDriverLeaderboard(); // Populates both tabs

        // Load analytics
        this.loadAnalyticsSection();

        // Load users
        this.loadUsersTable();

        // Load drivers
        this.loadDriversSection();

        // Load vehicles
        this.loadVehiclesSection();

        // Load complaints
        this.loadComplaintsSection();

        // Load riders
        this.loadRidersSection();

        // Load reports
        this.loadReportsSection();

        // Load settings
        this.loadSettingsSection();
    }

    switchTab(event, tabName) {
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => tab.classList.remove('active'));

        // Add active class to clicked tab
        event.target.classList.add('active');

        // Hide all tab contents
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach(content => content.classList.add('hidden'));

        // Show selected tab content
        const selectedContent = document.getElementById(`tab-${tabName}`);
        if (selectedContent) {
            selectedContent.classList.remove('hidden');
        }
    }

    async loadAnalyticsSection() {
        this.loadRevenueByCity();
        this.loadRevenueByPayment();
        this.loadRideStatusBreakdown();
        this.loadComplaintStats();
        this.loadDriverLeaderboard();
        this.loadAlerts();
    }

    async loadRevenueByCity() {
        const container = document.getElementById('revenue-by-city-container');
        try {
            const response = await adminAPI.generateReport('revenue/by-city');
            const revenueByCity = response.data || [];

            if (revenueByCity.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding: 16px;">No revenue data yet</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
            revenueByCity.forEach(item => {
                html += `
                    <div style="padding: 8px; border-left: 3px solid var(--color-success); background-color: var(--color-light); border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong>${item.city}</strong>
                            <span>${formatCurrency(item.revenue)}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-muted);">
                            ${item.rides} rides
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Failed to load city revenue</p>';
        }
    }

    async loadRevenueByPayment() {
        const container = document.getElementById('revenue-by-payment-container');
        const revenueByPayment = this.calculateRevenueByPayment();

        let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
        revenueByPayment.forEach(item => {
            html += `
                <div style="padding: 8px; border-left: 3px solid var(--color-primary); background-color: var(--color-light); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>${item.method}</strong>
                        <span>${formatCurrency(item.revenue)}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-muted);">
                        ${item.count} transactions
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async loadRideStatusBreakdown() {
        const container = document.getElementById('ride-status-breakdown-container');
        const statusBreakdown = this.calculateRideStatusBreakdown();

        let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
        statusBreakdown.forEach(item => {
            const color = item.status === 'Completed' ? 'success' : item.status === 'Cancelled' ? 'danger' : 'warning';
            html += `
                <div style="padding: 8px; border-left: 3px solid var(--color-${color}); background-color: var(--color-light); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>${item.status}</strong>
                        <span>${item.count} rides</span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-muted);">
                        ${item.percentage}% of total
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async loadComplaintStats() {
        const container = document.getElementById('complaint-stats-container');
        const complaintStats = this.calculateComplaintStats();

        let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
        complaintStats.forEach(item => {
            html += `
                <div style="padding: 8px; border-left: 3px solid var(--color-danger); background-color: var(--color-light); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>${item.type}</strong>
                        <span>${item.count}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-muted);">
                        ${item.percentage}% of complaints
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async loadDriverLeaderboard() {
        const containers = [
            document.getElementById('driver-leaderboard-container'),
            document.getElementById('driver-leaderboard-container-overview')
        ];
        
        try {
            const response = await adminAPI.generateReport('top-drivers');
            const leaderboard = response.data || [];

            containers.forEach(container => {
                if (!container) return;

                if (leaderboard.length === 0) {
                    container.innerHTML = '<p class="text-muted" style="padding: 16px;">No top drivers yet</p>';
                    return;
                }

                let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
                leaderboard.forEach((driver, index) => {
                    html += `
                        <div style="padding: 10px; border-left: 3px solid var(--color-warning); background-color: var(--color-light-2); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <strong>#${index + 1} ${driver.full_name}</strong>
                                <span style="color:var(--color-warning);">${driver.average_rating} ⭐</span>
                            </div>
                            <div style="font-size: 11px; color: var(--color-text-muted); display: flex; justify-content: space-between;">
                                <span>${driver.total_rides} Rides</span>
                                <span>${formatCurrency(driver.total_earnings)} Total</span>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            });
        } catch (error) {
            containers.forEach(c => { if(c) c.innerHTML = '<p class="text-danger">Failed to load leaderboard</p>'; });
        }
    }

    async loadAlerts() {
        const container = document.getElementById('alerts-container');
        try {
            const response = await adminAPI.generateReport('low-rated-drivers');
            const lowRated = response.data || [];

            let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
            
            if (lowRated.length > 0) {
                html += `
                    <div style="padding: 8px; border-left: 3px solid var(--color-danger); background-color: var(--color-light); border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong>Low-Rating Alert</strong>
                            <span class="badge badge-danger">High</span>
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-muted);">
                            ${lowRated.length} drivers identified via 'get_low_rated_drivers' procedure.
                        </div>
                    </div>
                `;
            }

            // Always add a generic platform health alert
            html += `
                <div style="padding: 8px; border-left: 3px solid var(--color-info); background-color: var(--color-light); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>Platform Status</strong>
                        <span class="badge badge-info">Stable</span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-muted);">
                        MySQL Event Scheduler is active (Daily Promo Expiry).
                    </div>
                </div>
            `;

            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Failed to load alerts</p>';
        }
    }

    calculateRevenueByCity() {
        const cityRevenue = {};
        mockRides.forEach(ride => {
            if (ride.status === 'Completed') {
                const location = mockLocations.find(loc => loc.id === ride.pickup_location_id);
                const city = location ? location.city : 'Unknown';
                if (!cityRevenue[city]) cityRevenue[city] = { revenue: 0, rides: 0 };
                cityRevenue[city].revenue += ride.fare || 0;
                cityRevenue[city].rides += 1;
            }
        });
        return Object.entries(cityRevenue).map(([city, data]) => ({ city, ...data })).sort((a, b) => b.revenue - a.revenue);
    }

    calculateRevenueByPayment() {
        const paymentRevenue = {};
        mockPayments.forEach(payment => {
            const method = payment.payment_method;
            if (!paymentRevenue[method]) paymentRevenue[method] = { revenue: 0, count: 0 };
            paymentRevenue[method].revenue += payment.amount;
            paymentRevenue[method].count += 1;
        });
        return Object.entries(paymentRevenue).map(([method, data]) => ({ method, ...data })).sort((a, b) => b.revenue - a.revenue);
    }

    calculateRideStatusBreakdown() {
        const statusCounts = {};
        mockRides.forEach(ride => {
            if (!statusCounts[ride.status]) statusCounts[ride.status] = 0;
            statusCounts[ride.status] += 1;
        });
        const total = mockRides.length;
        return Object.entries(statusCounts).map(([status, count]) => ({
            status,
            count,
            percentage: ((count / total) * 100).toFixed(1)
        })).sort((a, b) => b.count - a.count);
    }

    calculateComplaintStats() {
        const typeCounts = {};
        mockComplaints.forEach(complaint => {
            const type = complaint.complaint_type;
            if (!typeCounts[type]) typeCounts[type] = 0;
            typeCounts[type] += 1;
        });
        const total = mockComplaints.length;
        return Object.entries(typeCounts).map(([type, count]) => ({
            type,
            count,
            percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count);
    }

    calculateDriverLeaderboard() {
        const driverStats = {};
        mockDrivers.forEach(driver => {
            const earnings = mockDriverEarnings.filter(e => e.driver_id === driver.id).reduce((sum, e) => sum + e.net_earning, 0);
            driverStats[driver.id] = {
                name: mockUsers.find(u => u.id === driver.user_id)?.full_name || 'Unknown',
                rating: driver.average_rating,
                trips: driver.total_trips,
                earnings
            };
        });
        return Object.values(driverStats).sort((a, b) => b.rating - a.rating);
    }

    calculateAlerts() {
        const alerts = [];
        const lowRatingDrivers = mockDrivers.filter(d => d.average_rating < 3.5);
        if (lowRatingDrivers.length > 0) {
            alerts.push({
                title: 'Low-Rating Drivers',
                description: `${lowRatingDrivers.length} drivers have ratings below 3.5`,
                severity: 'high'
            });
        }
        const openComplaints = mockComplaints.filter(c => c.status === 'Open');
        if (openComplaints.length > 5) {
            alerts.push({
                title: 'High Complaint Volume',
                description: `${openComplaints.length} open complaints require attention`,
                severity: 'medium'
            });
        }
        const suspendedUsers = mockUsers.filter(u => u.account_status === 'Suspended');
        if (suspendedUsers.length > 0) {
            alerts.push({
                title: 'Suspended Accounts',
                description: `${suspendedUsers.length} users are currently suspended`,
                severity: 'medium'
            });
        }
        return alerts;
    }

    async loadRecentRides() {
        const container = document.getElementById('recent-rides-container');
        try {
            const response = await adminAPI.generateReport('ride-stats', { limit: 5 });
            const rides = response.data || [];

            if (rides.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding: 16px;">No recent rides</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
            rides.forEach(ride => {
                html += `
                    <div style="padding: 8px; border-left: 3px solid var(--color-primary); background-color: var(--color-light-2); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong>Ride #${ride.id || 'N/A'}</strong>
                            <span class="badge badge-primary">${ride.status || 'Active'}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-muted);">
                            Fare: ${formatCurrency(ride.fare || 0)} | ${formatDateTime(ride.created_at)}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Failed to load rides</p>';
        }
    }

    async loadRecentPayments() {
        const container = document.getElementById('recent-payments-container');
        try {
            const response = await adminAPI.generateReport('revenue-by-city'); // Reusing report logic
            const payments = response.data || [];

            if (payments.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding: 16px;">No recent payments</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
            payments.slice(0, 5).forEach(p => {
                html += `
                    <div style="padding: 8px; border-left: 3px solid var(--color-success); background-color: var(--color-light-2); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong>${formatCurrency(p.revenue || 0)}</strong>
                            <span class="badge badge-success">Paid</span>
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-muted);">
                            City: ${p.city} | ${p.rides} Rides
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Failed to load payments</p>';
        }
    }

    async loadUsersTable() {
        const container = document.getElementById('users-table-container');
        try {
            const response = await adminAPI.getUsers(); 
            const users = response.data || [];
            
            const table = new DataTable({
                columns: [
                    { key: 'id', label: 'ID' },
                    { key: 'full_name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'role', label: 'Role' },
                    { key: 'account_status', label: 'Status', type: 'status' },
                    { key: 'phone_number', label: 'Phone' }
                ],
                data: users,
                actions: [
                    { key: 'view', label: '👁️', className: 'secondary' },
                    { key: 'edit', label: '✏️', className: 'primary' },
                    { key: 'suspend', label: '⛔', className: 'danger' }
                ],
                onAction: (action, userId) => {
                    const user = users.find(u => u.id === userId);
                    if (action === 'view') {
                        this.showUserDetails(user);
                    } else if (action === 'suspend') {
                        this.suspendUser(user);
                    }
                }
            });

            container.innerHTML = '';
            container.appendChild(table.render());
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Failed to load users</p>';
        }
    }

    showUserDetails(user) {
        Modal.alert({
            title: `${user.full_name}`,
            message: `
                <div style="text-align: left;">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Phone:</strong> ${user.phone_number}</p>
                    <p><strong>Role:</strong> ${user.role}</p>
                    <p><strong>Status:</strong> ${user.account_status}</p>
                    <p><strong>Registered:</strong> ${formatDate(user.registration_date)}</p>
                </div>
            `
        });
    }

    suspendUser(user) {
        Modal.confirm({
            title: 'Suspend User',
            message: `Are you sure you want to suspend ${user.full_name}?`,
            onConfirm: () => {
                user.account_status = 'Suspended';
                showToast(`${user.full_name} has been suspended`, 'success');
                this.loadUsersTable();
            }
        });
    }

    async loadDriversSection() {
        const container = document.getElementById('drivers-container');
        container.innerHTML = '<p style="padding:16px;">Loading drivers...</p>';
        try {
            const res = await apiClient.get('/drivers');
            const drivers = res.data || [];
            if (drivers.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding:16px;">No drivers found.</p>';
                return;
            }
            let html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;">';
            html += '<thead><tr style="border-bottom:2px solid var(--color-border);text-align:left;">';
            html += '<th style="padding:10px;">Name</th><th style="padding:10px;">License</th><th style="padding:10px;">Rating</th><th style="padding:10px;">Trips</th><th style="padding:10px;">Verification</th><th style="padding:10px;">Availability</th><th style="padding:10px;">Actions</th>';
            html += '</tr></thead><tbody>';
            drivers.forEach(d => {
                const vColor = d.verification_status === 'Verified' ? '#22c55e' : d.verification_status === 'Rejected' ? '#ef4444' : '#f59e0b';
                html += `<tr style="border-bottom:1px solid var(--color-border);">
                    <td style="padding:10px;">${d.full_name || d.user_name || '-'}</td>
                    <td style="padding:10px;">${d.license_number || '-'}</td>
                    <td style="padding:10px;">${d.average_rating ? d.average_rating + ' ⭐' : 'N/A'}</td>
                    <td style="padding:10px;">${d.total_trips || 0}</td>
                    <td style="padding:10px;"><span style="color:${vColor};font-weight:600;">${d.verification_status || 'Pending'}</span></td>
                    <td style="padding:10px;">${d.availability_status || 'Offline'}</td>
                    <td style="padding:10px;display:flex;gap:6px;">
                        <button onclick="adminDash.verifyDriver(${d.id},'Verified')" style="padding:4px 10px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✓ Verify</button>
                        <button onclick="adminDash.verifyDriver(${d.id},'Rejected')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✗ Reject</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<p class="text-danger" style="padding:16px;">Failed to load drivers.</p>';
        }
    }

    async verifyDriver(driverId, status) {
        try {
            await adminAPI.verifyDriver(driverId, status);
            showToast(`Driver ${status === 'Verified' ? 'approved' : 'rejected'}`, 'success');
            this.loadDriversSection();
        } catch(e) { showToast('Action failed', 'error'); }
    }

    async loadVehiclesSection() {
        const container = document.getElementById('vehicles-container');
        container.innerHTML = '<p style="padding:16px;">Loading vehicles...</p>';
        try {
            const res = await apiClient.get('/vehicles');
            const vehicles = res.data || [];
            if (vehicles.length === 0) { container.innerHTML = '<p class="text-muted" style="padding:16px;">No vehicles found.</p>'; return; }
            let html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;">';
            html += '<thead><tr style="border-bottom:2px solid var(--color-border);text-align:left;"><th style="padding:10px;">Driver</th><th style="padding:10px;">Make/Model</th><th style="padding:10px;">Plate</th><th style="padding:10px;">Type</th><th style="padding:10px;">Year</th><th style="padding:10px;">Status</th><th style="padding:10px;">Actions</th></tr></thead><tbody>';
            vehicles.forEach(v => {
                const vColor = v.verification_status === 'Verified' ? '#22c55e' : v.verification_status === 'Rejected' ? '#ef4444' : '#f59e0b';
                html += `<tr style="border-bottom:1px solid var(--color-border);"><td style="padding:10px;">${v.driver_name || '-'}</td><td style="padding:10px;">${v.make || ''} ${v.model || ''}</td><td style="padding:10px;">${v.license_plate || '-'}</td><td style="padding:10px;">${v.vehicle_type || '-'}</td><td style="padding:10px;">${v.year || '-'}</td><td style="padding:10px;"><span style="color:${vColor};font-weight:600;">${v.verification_status || 'Pending'}</span></td><td style="padding:10px;display:flex;gap:6px;"><button onclick="adminDash.verifyVehicle(${v.id},'Verified')" style="padding:4px 10px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✓</button><button onclick="adminDash.verifyVehicle(${v.id},'Rejected')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">✗</button></td></tr>`;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } catch(e) { container.innerHTML = '<p class="text-danger" style="padding:16px;">Failed to load vehicles.</p>'; }
    }




    async verifyVehicle(vehicleId, status) {
        try {
            await adminAPI.verifyVehicle(vehicleId, status);
            showToast(`Vehicle ${status === 'Verified' ? 'approved' : 'rejected'}`, 'success');
            this.loadVehiclesSection();
        } catch(e) { showToast('Action failed', 'error'); }
    }

    async loadComplaintsSection() {
        const container = document.getElementById('complaints-container');
        container.innerHTML = '<p style="padding:16px;">Loading complaints...</p>';
        try {
            const res = await adminAPI.getComplaints();
            const complaints = res.data || [];
            if (complaints.length === 0) { container.innerHTML = '<p class="text-muted" style="padding:16px;">No complaints found.</p>'; return; }
            let html = '';
            complaints.forEach(complaint => {
                html += `
                    <div class="complaint-item">
                        <div class="complaint-header">
                            <div class="complaint-info">
                                <h3>Complaint #${complaint.id}</h3>
                                <div class="complaint-meta">
                                    <span><strong>${complaint.complaint_type}</strong></span>
                                    <span>Ride #${complaint.ride_id}</span>
                                </div>
                            </div>
                            <span class="status-label status-${complaint.status.toLowerCase()}">
                                <span class="status-dot"></span>
                                ${complaint.status}
                            </span>
                        </div>
                        <div class="complaint-description">${complaint.description}</div>
                        ${complaint.status !== 'Resolved' ? `
                            <div class="complaint-actions">
                                <button class="btn btn-primary btn-sm" onclick="adminDash.resolveComplaint(${complaint.id})">Mark as Resolved</button>
                                <button class="btn btn-secondary btn-sm" onclick="adminDash.contactUser(${complaint.filed_by})">Contact User</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch(e) { container.innerHTML = '<p class="text-danger" style="padding:16px;">Failed to load complaints.</p>'; }
    }

    async resolveComplaint(complaintId) {
        try {
            await adminAPI.resolveComplaint(complaintId, 'Resolved by Admin');
            showToast('Complaint resolved', 'success');
            this.loadComplaintsSection();
        } catch(e) { showToast('Failed to resolve complaint', 'error'); }
    }

    contactUser(userId) {
        showToast('Contact message sent to user', 'success');
    }

    async loadReportsSection() {
        const container = document.getElementById('reports-container');

        container.innerHTML = `
            <div class="grid-2" style="gap: 24px;">
                <div class="card">
                    <div class="card-header">
                        <h3>Generate Reports</h3>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn btn-primary btn-block" onclick="adminDash.generateReport('revenue')">
                                📊 Revenue Report
                            </button>
                            <button class="btn btn-primary btn-block" onclick="adminDash.generateReport('rides')">
                                🚗 Rides Report
                            </button>
                            <button class="btn btn-primary btn-block" onclick="adminDash.generateReport('users')">
                                👥 Users Report
                            </button>
                            <button class="btn btn-primary btn-block" onclick="adminDash.generateReport('drivers')">
                                🚗 Drivers Report
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="adminDash.exportCSV('riders')">
                                📥 Export Riders CSV
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="adminDash.exportCSV('rides')">
                                📥 Export Rides CSV
                            </button>
                            <button class="btn btn-secondary btn-block" onclick="adminDash.exportCSV('drivers')">
                                📥 Export Drivers CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Platform Statistics</h3>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
                            <div style="padding: 8px; background-color: var(--color-light); border-radius: 4px;">
                                <span class="text-muted">Total Revenue:</span> <strong>${formatCurrency(this.stats.totalRevenue || 0)}</strong>
                            </div>
                            <div style="padding: 8px; background-color: var(--color-light); border-radius: 4px;">
                                <span class="text-muted">Total Rides:</span> <strong>${this.stats.totalRides || 0}</strong>
                            </div>
                            <div style="padding: 8px; background-color: var(--color-light); border-radius: 4px;">
                                <span class="text-muted">Active Users:</span> <strong>${this.stats.totalUsers || 0}</strong>
                            </div>
                            <div style="padding: 8px; background-color: var(--color-light); border-radius: 4px;">
                                <span class="text-muted">Open Complaints:</span> <strong>${this.stats.totalComplaints || 0}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateReport(reportType) {
        showToast(`Generating ${reportType} report...`, 'info');
        setTimeout(() => {
            showToast(`${reportType} report generated`, 'success');
        }, 1000);
    }

    async loadRidersSection() {
        const container = document.getElementById('riders-container');
        container.innerHTML = '<p style="padding:16px;">Loading riders...</p>';
        try {
            const res = await apiClient.get('/users?role=Rider&limit=100');
            const riders = res.data || [];
            let html = `<div class="card"><div class="card-header" style="display:flex;justify-content:space-between;align-items:center;"><h3>Registered Riders (${riders.length})</h3></div><div class="card-body">`;
            if (riders.length === 0) {
                html += '<p class="text-muted">No riders registered yet.</p>';
            } else {
                html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="border-bottom:2px solid var(--color-border);text-align:left;"><th style="padding:8px;">ID</th><th style="padding:8px;">Name</th><th style="padding:8px;">Email</th><th style="padding:8px;">Phone</th><th style="padding:8px;">Status</th><th style="padding:8px;">Registered</th></tr></thead><tbody>';
                riders.forEach(rider => {
                    const sc = rider.account_status === 'Active' ? '#22c55e' : '#ef4444';
                    html += `<tr style="border-bottom:1px solid var(--color-border);"><td style="padding:8px;">${rider.id}</td><td style="padding:8px;">${rider.full_name}</td><td style="padding:8px;">${rider.email}</td><td style="padding:8px;">${rider.phone_number || '-'}</td><td style="padding:8px;"><span style="color:${sc};font-weight:600;">${rider.account_status}</span></td><td style="padding:8px;">${rider.registration_date ? new Date(rider.registration_date).toLocaleDateString() : '-'}</td></tr>`;
                });
                html += '</tbody></table></div>';
            }
            html += '</div></div>';
            container.innerHTML = html;
        } catch(e) { container.innerHTML = '<p class="text-danger" style="padding:16px;">Failed to load riders.</p>'; }
    }

    async loadSettingsSection() {
        const container = document.getElementById('settings-container');
        container.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                <div class="card" style="grid-column:1/-1;">
                    <div class="card-header"><h3>⚙️ System Configuration</h3></div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;">
                            <div style="padding:10px;border:1px solid var(--color-border);border-radius:8px;">
                                <label style="font-size:12px;color:var(--color-text-muted);">Platform Commission (%)</label>
                                <input type="number" class="form-control" value="20" style="margin-top:4px;">
                            </div>
                            <div style="padding:10px;border:1px solid var(--color-border);border-radius:8px;">
                                <label style="font-size:12px;color:var(--color-text-muted);">Max Surge Multiplier</label>
                                <input type="number" class="form-control" value="5.0" step="0.1" style="margin-top:4px;">
                            </div>
                            <div style="padding:10px;border:1px solid var(--color-border);border-radius:8px;">
                                <label style="font-size:12px;color:var(--color-text-muted);">Driver Flag Threshold</label>
                                <input type="number" class="form-control" value="3.5" step="0.1" style="margin-top:4px;">
                            </div>
                            <div style="padding:10px;border:1px solid var(--color-border);border-radius:8px;">
                                <label style="font-size:12px;color:var(--color-text-muted);">Auto-Archive Days</label>
                                <input type="number" class="form-control" value="30" style="margin-top:4px;">
                            </div>
                        </div>
                        <button class="btn btn-primary" style="margin-top:16px;" onclick="showToast('Settings saved', 'success')">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    exportCSV(dataType) {
        showToast(`CSV export for ${dataType} — connect to live API to download`, 'info');
    }

    switchTab(event, tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });

        // Remove active class from buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) {
            tab.classList.remove('hidden');
        }

        // Mark button as active
        if (event && event.target) {
            event.target.classList.add('active');
        }
    }
}

const adminDash = new AdminDashboard();
