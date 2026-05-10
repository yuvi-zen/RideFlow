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
        } catch (error) {
            showToast('Failed to load stats', 'error');
        }

        this.container.innerHTML = `
            <div class="admin-dashboard">
                <!-- Demo Banner -->
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:10px 20px;text-align:center;font-size:13px;font-weight:600;border-radius:8px;margin-bottom:16px;">
                    🎯 Demo Mode — All data is simulated. No real API calls are being made.
                </div>

                <!-- Header -->
                <div class="dashboard-header">
                    <h1>Admin Dashboard</h1>
                    <p>Manage all platform activities and users</p>
                </div>

                <div class="container-fluid">
                    <!-- Statistics Cards -->
                    <div class="stats-grid">
                        ${this.createStatCard('👥', 'Total Users', this.stats.totalUsers || 0, 'primary')}
                        ${this.createStatCard('👤', 'Total Riders', this.stats.totalRiders || 0, 'success')}
                        ${this.createStatCard('🚗', 'Total Drivers', this.stats.totalDrivers || 0, 'warning')}
                        ${this.createStatCard('🛣️', 'Total Rides', this.stats.totalRides || 0, 'primary')}
                        ${this.createStatCard('💰', 'Platform Revenue', formatCurrency(this.stats.totalRevenue || 0), 'success')}
                        ${this.createStatCard('⚠️', 'Open Complaints', this.stats.totalComplaints || 0, 'danger')}
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
                            <div class="grid-2" style="gap: 24px;">
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
        const colors = {
            primary: 'primary',
            success: 'success',
            warning: 'warning',
            danger: 'danger'
        };

        const statCard = new CardFactory().createStatCard({
            icon,
            label,
            value,
            backgroundColor: colors[type] || 'primary'
        });

        return statCard.outerHTML;
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
        const container = document.getElementById('driver-leaderboard-container');
        try {
            const response = await adminAPI.generateReport('top-drivers');
            const leaderboard = response.data || [];

            if (leaderboard.length === 0) {
                container.innerHTML = '<p class="text-muted" style="padding: 16px;">No top drivers yet</p>';
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
            leaderboard.forEach((driver, index) => {
                html += `
                    <div style="padding: 8px; border-left: 3px solid var(--color-warning); background-color: var(--color-light); border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <strong>#${index + 1} ${driver.full_name}</strong>
                            <span>${driver.average_rating} ⭐</span>
                        </div>
                        <div style="font-size: 12px; color: var(--color-text-muted);">
                            View: TopDriversView
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (error) {
            container.innerHTML = '<p class="text-danger">Failed to load leaderboard</p>';
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
        const rides = mockRides.slice(0, 5);

        if (rides.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding: 16px;">No recent rides</p>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
        rides.forEach(ride => {
            html += `
                <div style="padding: 8px; border-left: 3px solid var(--color-primary); background-color: var(--color-light); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>Ride #${ride.id}</strong>
                        <span class="badge badge-${ride.status === 'Completed' ? 'success' : ride.status === 'Cancelled' ? 'danger' : 'primary'}">${ride.status}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-muted);">
                        Fare: ${formatCurrency(ride.fare || 0)} | ${formatDateTime(ride.created_at)}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async loadRecentPayments() {
        const container = document.getElementById('recent-payments-container');
        const payments = mockPayments.slice(0, 5);

        if (payments.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding: 16px;">No recent payments</p>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 12px;">';
        payments.forEach(payment => {
            html += `
                <div style="padding: 8px; border-left: 3px solid var(--color-success); background-color: var(--color-light); border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>${formatCurrency(payment.amount)}</strong>
                        <span class="badge badge-success">${payment.payment_status}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--color-text-muted);">
                        ${payment.payment_method} | ${formatDateTime(payment.transaction_date)}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    async loadUsersTable() {
        const container = document.getElementById('users-table-container');
        
        const table = new DataTable({
            columns: [
                { key: 'id', label: 'ID' },
                { key: 'full_name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role' },
                { key: 'account_status', label: 'Status', type: 'status' },
                { key: 'phone_number', label: 'Phone' }
            ],
            data: mockUsers,
            actions: [
                { key: 'view', label: '👁️', className: 'secondary' },
                { key: 'edit', label: '✏️', className: 'primary' },
                { key: 'suspend', label: '⛔', className: 'danger' }
            ],
            onAction: (action, userId) => {
                const user = mockUsers.find(u => u.id === userId);
                if (action === 'view') {
                    this.showUserDetails(user);
                } else if (action === 'suspend') {
                    this.suspendUser(user);
                }
            }
        });

        container.innerHTML = '';
        container.appendChild(table.render());
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
        const unverifiedDrivers = mockDrivers.filter(d => d.verification_status !== 'Verified');

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">';

        if (unverifiedDrivers.length === 0) {
            html += '<p class="text-muted">All drivers are verified</p>';
        } else {
            unverifiedDrivers.forEach(driver => {
                const user = mockUsers.find(u => u.id === driver.user_id);
                html += `
                    <div class="verification-card">
                        <div class="verification-card-header">
                            <h3>${user.full_name}</h3>
                            <span class="badge badge-warning">${driver.verification_status}</span>
                        </div>
                        <div class="verification-card-body">
                            <div class="verification-card-item">
                                <label>License Number</label>
                                <p>${driver.license_number}</p>
                            </div>
                            <div class="verification-card-item">
                                <label>CNIC</label>
                                <p>${driver.cnic}</p>
                            </div>
                            <div class="verification-card-item">
                                <label>Email</label>
                                <p>${user.email}</p>
                            </div>
                        </div>
                        <div class="verification-actions">
                            <button class="btn btn-danger" onclick="adminDash.verifyDriver(${driver.id}, 'Rejected')">Reject</button>
                            <button class="btn btn-success" onclick="adminDash.verifyDriver(${driver.id}, 'Verified')">Approve</button>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        container.innerHTML = html;
    }

    verifyDriver(driverId, status) {
        const driver = mockDrivers.find(d => d.id === driverId);
        if (driver) {
            driver.verification_status = status;
            showToast(`Driver ${status === 'Verified' ? 'approved' : 'rejected'}`, 'success');
            this.loadDriversSection();
        }
    }

    async loadVehiclesSection() {
        const container = document.getElementById('vehicles-container');
        const unverifiedVehicles = mockVehicles.filter(v => v.verification_status !== 'Verified');

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">';

        if (unverifiedVehicles.length === 0) {
            html += '<p class="text-muted">All vehicles are verified</p>';
        } else {
            unverifiedVehicles.forEach(vehicle => {
                const driver = mockDrivers.find(d => d.id === vehicle.driver_id);
                const user = mockUsers.find(u => u.id === driver.user_id);
                html += `
                    <div class="verification-card">
                        <div class="verification-card-header">
                            <h3>${vehicle.make} ${vehicle.model}</h3>
                            <span class="badge badge-warning">${vehicle.verification_status}</span>
                        </div>
                        <div class="verification-card-body">
                            <div class="verification-card-item">
                                <label>Driver</label>
                                <p>${user.full_name}</p>
                            </div>
                            <div class="verification-card-item">
                                <label>License Plate</label>
                                <p>${vehicle.license_plate}</p>
                            </div>
                            <div class="verification-card-item">
                                <label>Year</label>
                                <p>${vehicle.year}</p>
                            </div>
                            <div class="verification-card-item">
                                <label>Type</label>
                                <p>${vehicle.vehicle_type}</p>
                            </div>
                        </div>
                        <div class="verification-actions">
                            <button class="btn btn-danger" onclick="adminDash.verifyVehicle(${vehicle.id}, 'Rejected')">Reject</button>
                            <button class="btn btn-success" onclick="adminDash.verifyVehicle(${vehicle.id}, 'Verified')">Approve</button>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        container.innerHTML = html;
    }

    verifyVehicle(vehicleId, status) {
        const vehicle = mockVehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            vehicle.verification_status = status;
            showToast(`Vehicle ${status === 'Verified' ? 'approved' : 'rejected'}`, 'success');
            this.loadVehiclesSection();
        }
    }

    async loadComplaintsSection() {
        const container = document.getElementById('complaints-container');

        let html = '';
        if (mockComplaints.length === 0) {
            html = '<p class="text-muted">No complaints</p>';
        } else {
            mockComplaints.forEach(complaint => {
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
        }

        container.innerHTML = html;
    }

    resolveComplaint(complaintId) {
        const complaint = mockComplaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.status = 'Resolved';
            complaint.resolved_at = new Date().toISOString();
            showToast('Complaint resolved', 'success');
            this.loadComplaintsSection();
        }
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
        const riders = mockUsers.filter(u => u.role === 'Rider');

        let html = `
            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                    <h3>Registered Riders</h3>
                    <button class="btn btn-sm btn-primary" onclick="adminDash.exportCSV('riders')">📥 Export CSV</button>
                </div>
                <div class="card-body">
        `;

        if (riders.length === 0) {
            html += '<p class="text-muted">No riders registered yet.</p>';
        } else {
            html += '<table class="data-table" style="width:100%;border-collapse:collapse;">';
            html += '<thead><tr style="border-bottom:2px solid var(--color-border);text-align:left;">';
            html += '<th style="padding:8px;">ID</th><th style="padding:8px;">Name</th><th style="padding:8px;">Email</th><th style="padding:8px;">Phone</th><th style="padding:8px;">Status</th><th style="padding:8px;">Rides</th><th style="padding:8px;">Spent</th>';
            html += '</tr></thead><tbody>';
            riders.forEach(rider => {
                const riderRides = mockRides.filter(r => r.rider_id === rider.id && r.status === 'Completed');
                const totalSpent = riderRides.reduce((sum, r) => sum + (r.fare || r.final_fare || 0), 0);
                html += `<tr style="border-bottom:1px solid var(--color-border);">
                    <td style="padding:8px;">${rider.id}</td>
                    <td style="padding:8px;">${rider.full_name}</td>
                    <td style="padding:8px;">${rider.email}</td>
                    <td style="padding:8px;">${rider.phone_number}</td>
                    <td style="padding:8px;"><span class="badge badge-${rider.account_status === 'Active' ? 'success' : 'danger'}">${rider.account_status}</span></td>
                    <td style="padding:8px;">${riderRides.length}</td>
                    <td style="padding:8px;">${formatCurrency(totalSpent)}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }

        html += '</div></div>';
        container.innerHTML = html;
    }

    async loadSettingsSection() {
        const container = document.getElementById('settings-container');

        container.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                <!-- Fare Rules -->
                <div class="card">
                    <div class="card-header"><h3>💰 Fare Rules</h3></div>
                    <div class="card-body">
                        <div style="display:flex;flex-direction:column;gap:14px;">
                            ${(mockFareRules || []).map(rule => `
                                <div style="padding:12px;border:1px solid var(--color-border);border-radius:8px;">
                                    <div style="font-weight:600;margin-bottom:8px;">${rule.vehicle_type}</div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
                                        <div>Base: <strong>PKR ${rule.base_rate}</strong></div>
                                        <div>Per km: <strong>PKR ${rule.per_km_rate}</strong></div>
                                        <div>Per min: <strong>PKR ${rule.per_minute_rate}</strong></div>
                                        <div>Surge: <strong>${rule.surge_multiplier}x</strong></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Promo Codes -->
                <div class="card">
                    <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                        <h3>🎟️ Promo Codes</h3>
                        <button class="btn btn-sm btn-primary" onclick="showToast('Add promo code form coming soon', 'info')">+ Add Code</button>
                    </div>
                    <div class="card-body">
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            ${(mockPromoCodes || []).map(code => `
                                <div style="padding:10px;border:1px solid var(--color-border);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-weight:600;">${code.code}</div>
                                        <div style="font-size:12px;color:var(--color-text-muted);">${code.discount_type === 'Percent' ? code.discount_value + '%' : 'PKR ' + code.discount_value} off • Used ${code.used_count}/${code.max_uses || '∞'}</div>
                                    </div>
                                    <span class="badge badge-${code.is_active ? 'success' : 'danger'}">${code.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- System Config -->
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
                        <button class="btn btn-primary" style="margin-top:16px;" onclick="showToast('Settings saved (demo)', 'success')">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    exportCSV(dataType) {
        let csvContent = '';
        let filename = '';

        if (dataType === 'riders') {
            const riders = mockUsers.filter(u => u.role === 'Rider');
            csvContent = 'ID,Name,Email,Phone,Status,Registered\n';
            riders.forEach(r => {
                csvContent += `${r.id},"${r.full_name}","${r.email}","${r.phone_number}",${r.account_status},${r.registration_date || ''}\n`;
            });
            filename = 'riders_export.csv';
        } else if (dataType === 'rides') {
            csvContent = 'ID,Rider ID,Driver ID,Status,Fare,Created\n';
            mockRides.forEach(r => {
                csvContent += `${r.id},${r.rider_id},${r.driver_id || ''},${r.status},${r.fare || r.final_fare || 0},${r.created_at}\n`;
            });
            filename = 'rides_export.csv';
        } else if (dataType === 'drivers') {
            csvContent = 'ID,Name,Rating,Trips,Verification,Status\n';
            mockDrivers.forEach(d => {
                const user = mockUsers.find(u => u.id === d.user_id);
                csvContent += `${d.id},"${user?.full_name || ''}",${d.average_rating},${d.total_trips_completed},${d.verification_status},${d.availability_status}\n`;
            });
            filename = 'drivers_export.csv';
        }

        if (!csvContent) {
            showToast('No data to export', 'warning');
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast(`${dataType} CSV exported`, 'success');
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
