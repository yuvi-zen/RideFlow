/**
 * admin-dashboard-page.js - Admin dashboard page logic
 * Renders overview, users, drivers, vehicles, rides, complaints, and reports.
 */

class AdminDashboardPage {
    constructor() {
        this.container = document.getElementById('main-content');
        this.layout = null;
        this.section = getCurrentRoute().section || 'overview';
        this.userTable = null;
        this.driverTable = null;
        this.vehicleTable = null;
        this.rideTable = null;
        this.complaintTable = null;
        this.reportRange = { start: null, end: null };
        this.hashChangeListenerAdded = false;
        this.handleHashChange = this.handleHashChange.bind(this);
    }

    render() {
        const user = getCurrentUser();
        this.section = getCurrentRoute().section || 'overview';
        this.layout = new AdminLayout({ user });
        this.layout.render(this.section);

        const content = document.getElementById('admin-dashboard-content');
        content.addEventListener('adminSectionChange', (event) => {
            navigateTo('admin-dashboard', event.detail.section);
        });

        if (!this.hashChangeListenerAdded) {
            window.addEventListener('hashchange', this.handleHashChange);
            this.hashChangeListenerAdded = true;
        }

        this.renderSection(this.section);
    }

    renderSection(section) {
        this.section = section || 'overview';
        this.layout.setActive(this.section);
        const content = document.getElementById('admin-dashboard-content');
        content.innerHTML = '';

        switch (this.section) {
            case 'overview':
                this.renderOverview(content);
                break;
            case 'users':
                this.renderUsers(content);
                break;
            case 'drivers':
                this.renderDrivers(content);
                break;
            case 'vehicles':
                this.renderVehicles(content);
                break;
            case 'rides':
                this.renderRides(content);
                break;
            case 'complaints':
                this.renderComplaints(content);
                break;
            case 'reports':
                this.renderReports(content);
                break;
            case 'settings':
                content.innerHTML = `<div class="admin-section"><h2>Settings</h2><p class="text-muted">Configuration panels will be available after backend integration.</p></div>`;
                break;
            default:
                this.renderOverview(content);
        }
    }

    handleHashChange() {
        const route = getCurrentRoute();
        if (route.page === 'admin-dashboard') {
            const section = route.section || 'overview';
            if (section !== this.section) {
                this.renderSection(section);
            }
        }
    }

    renderOverview(container) {
        const totalUsers = mockUsers.length;
        const totalRiders = mockUsers.filter(u => u.role === 'Rider').length;
        const totalDrivers = mockUsers.filter(u => u.role === 'Driver').length;
        const totalRides = mockRides.length;
        const totalRevenue = mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalComplaints = mockComplaints.length;
        const verifiedVehicles = mockVehicles.filter(v => v.verification_status === 'Verified').length;
        const pendingVerifications = mockVehicles.filter(v => v.verification_status === 'Pending').length + mockDrivers.filter(d => d.verification_status === 'Pending').length;

        container.innerHTML = `
            <div class="admin-section admin-overview">
                <div class="admin-section-head">
                    <div>
                        <h2>Overview</h2>
                        <p class="text-muted">Platform health, activity metrics, and verification pipeline status.</p>
                    </div>
                </div>

                <div class="admin-grid admin-grid-4">
                    <div class="stat-card stat-card-primary">
                        <div class="stat-card-title">Total Users</div>
                        <div class="stat-card-value">${totalUsers}</div>
                    </div>
                    <div class="stat-card stat-card-success">
                        <div class="stat-card-title">Total Riders</div>
                        <div class="stat-card-value">${totalRiders}</div>
                    </div>
                    <div class="stat-card stat-card-info">
                        <div class="stat-card-title">Total Drivers</div>
                        <div class="stat-card-value">${totalDrivers}</div>
                    </div>
                    <div class="stat-card stat-card-warning">
                        <div class="stat-card-title">Total Rides</div>
                        <div class="stat-card-value">${totalRides}</div>
                    </div>
                    <div class="stat-card stat-card-strong">
                        <div class="stat-card-title">Total Revenue</div>
                        <div class="stat-card-value">${formatCurrency(totalRevenue)}</div>
                    </div>
                    <div class="stat-card stat-card-danger">
                        <div class="stat-card-title">Total Complaints</div>
                        <div class="stat-card-value">${totalComplaints}</div>
                    </div>
                    <div class="stat-card stat-card-success">
                        <div class="stat-card-title">Verified Vehicles</div>
                        <div class="stat-card-value">${verifiedVehicles}</div>
                    </div>
                    <div class="stat-card stat-card-warning">
                        <div class="stat-card-title">Pending Verifications</div>
                        <div class="stat-card-value">${pendingVerifications}</div>
                    </div>
                </div>

                <div class="admin-grid admin-grid-2" style="margin-top: 24px;">
                    <div class="panel-card">
                        <div class="panel-header"><h3>Recent Requests & Alerts</h3></div>
                        <div class="panel-body">
                            <ul class="compact-list">
                                ${mockRides.slice(-4).reverse().map(ride => {
                                    const rider = mockUsers.find(u => u.id === ride.rider_id) || {};
                                    return `<li><strong>Ride #${ride.id}</strong> from ${ride.pickup_location_id} to ${ride.dropoff_location_id} — ${ride.status} by ${rider.full_name || 'Unknown'}</li>`;
                                }).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="panel-card">
                        <div class="panel-header"><h3>Verification Pipeline</h3></div>
                        <div class="panel-body">
                            <div class="verification-summary">
                                <div><strong>${mockDrivers.filter(d => d.verification_status === 'Pending').length}</strong><span>Drivers pending</span></div>
                                <div><strong>${mockVehicles.filter(v => v.verification_status === 'Pending').length}</strong><span>Vehicles pending</span></div>
                                <div><strong>${mockDrivers.filter(d => d.verification_status === 'Rejected').length}</strong><span>Driver rejections</span></div>
                                <div><strong>${mockVehicles.filter(v => v.verification_status === 'Rejected').length}</strong><span>Vehicle rejections</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderUsers(container) {
        this.sectionHeader(container, 'User Management', 'Manage riders, drivers, and admin users in one place.');

        container.innerHTML += `
            <div class="admin-section admin-section-fullwidth">
                <div class="panel-card panel-card-compact">
                    <div class="panel-actions">
                        <div class="filter-group">
                            <label>Search</label>
                            <input id="admin-user-search" type="search" placeholder="Search by name, email, phone..." />
                        </div>
                        <div class="filter-group">
                            <label>Role</label>
                            <select id="admin-user-role-filter">
                                <option value="">All roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Rider">Rider</option>
                                <option value="Driver">Driver</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label>Status</label>
                            <select id="admin-user-status-filter">
                                <option value="">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Banned">Banned</option>
                            </select>
                        </div>
                    </div>
                    <div id="admin-users-table"></div>
                </div>
            </div>
        `;

        this.buildUserTable();
        this.bindUserFilters();
    }

    buildUserTable() {
        const container = document.getElementById('admin-users-table');
        const columns = [
            { key: 'id', label: 'ID' },
            { key: 'full_name', label: 'Full name' },
            { key: 'email', label: 'Email' },
            { key: 'phone_number', label: 'Phone' },
            { key: 'role', label: 'Role' },
            { key: 'account_status', label: 'Status' },
            { key: 'registration_date', label: 'Registered', type: 'date' }
        ];
        const data = mockUsers;

        const table = new DataTable({
            columns,
            data,
            actions: [
                { key: 'view', label: 'View', className: 'secondary' },
                { key: 'edit', label: 'Edit', className: 'primary' },
                { key: 'suspend', label: 'Suspend', className: 'warning' },
                { key: 'ban', label: 'Ban', className: 'danger' },
                { key: 'activate', label: 'Activate', className: 'success' }
            ],
            onAction: (action, id) => this.handleUserAction(action, id)
        });

        container.innerHTML = '';
        container.appendChild(table.render());
        this.userTable = table;
    }

    bindUserFilters() {
        const searchInput = document.getElementById('admin-user-search');
        const roleFilter = document.getElementById('admin-user-role-filter');
        const statusFilter = document.getElementById('admin-user-status-filter');

        const apply = () => {
            const query = searchInput.value.trim().toLowerCase();
            const role = roleFilter.value;
            const status = statusFilter.value;

            const filtered = mockUsers.filter(user => {
                const searchText = `${user.full_name} ${user.email} ${user.phone_number} ${user.role}`.toLowerCase();
                const matchesQuery = !query || searchText.includes(query);
                const matchesRole = !role || user.role === role;
                const matchesStatus = !status || user.account_status === status;
                return matchesQuery && matchesRole && matchesStatus;
            });

            this.userTable.config.data = filtered;
            this.userTable.filteredData = filtered;
            this.userTable.currentPage = 1;
            this.userTable.updateTable(this.userTable.container);
        };

        searchInput.addEventListener('input', debounce(apply, 200));
        roleFilter.addEventListener('change', apply);
        statusFilter.addEventListener('change', apply);
    }

    renderDrivers(container) {
        this.sectionHeader(container, 'Driver Management', 'Verify drivers, review availability, and inspect driver profiles.');

        container.innerHTML += `
            <div class="admin-section admin-section-fullwidth">
                <div id="admin-drivers-table"></div>
            </div>
        `;

        this.buildDriversTable();
    }

    buildDriversTable() {
        const container = document.getElementById('admin-drivers-table');
        const driverRows = mockDrivers.map(driver => {
            const user = mockUsers.find(u => u.id === driver.user_id) || {};
            return {
                id: driver.id,
                driver_name: user.full_name || 'Unknown',
                license_number: driver.license_number,
                cnic: driver.cnic,
                verification_status: driver.verification_status,
                availability_status: driver.availability_status,
                total_trips: driver.total_trips,
                average_rating: driver.average_rating.toFixed(1),
                user_id: driver.user_id
            };
        });

        const columns = [
            { key: 'driver_name', label: 'Driver' },
            { key: 'license_number', label: 'License' },
            { key: 'cnic', label: 'CNIC' },
            { key: 'verification_status', label: 'Verification' },
            { key: 'availability_status', label: 'Availability' },
            { key: 'total_trips', label: 'Trips' },
            { key: 'average_rating', label: 'Rating' }
        ];

        const table = new DataTable({
            columns,
            data: driverRows,
            actions: [
                { key: 'verify', label: 'Verify', className: 'success' },
                { key: 'reject', label: 'Reject', className: 'danger' },
                { key: 'suspend', label: 'Suspend', className: 'warning' },
                { key: 'inspect', label: 'Inspect', className: 'secondary' }
            ],
            onAction: (action, id) => this.handleDriverAction(action, id)
        });

        container.innerHTML = '';
        container.appendChild(table.render());
        this.driverTable = table;
    }

    renderVehicles(container) {
        this.sectionHeader(container, 'Vehicle Management', 'Approve vehicle registrations and review vehicle details.');

        container.innerHTML += `
            <div class="admin-section admin-section-fullwidth">
                <div id="admin-vehicles-table"></div>
            </div>
        `;

        this.buildVehicleTable();
    }

    buildVehicleTable() {
        const container = document.getElementById('admin-vehicles-table');
        const vehicleRows = mockVehicles.map(vehicle => {
            const driver = mockDrivers.find(d => d.id === vehicle.driver_id) || {};
            const user = mockUsers.find(u => u.id === driver.user_id) || {};
            return {
                id: vehicle.id,
                driver_name: user.full_name || 'Unknown',
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                license_plate: vehicle.license_plate,
                vehicle_type: vehicle.vehicle_type,
                verification_status: vehicle.verification_status,
                driver_id: vehicle.driver_id
            };
        });

        const columns = [
            { key: 'id', label: 'Vehicle ID' },
            { key: 'driver_name', label: 'Driver' },
            { key: 'make', label: 'Make' },
            { key: 'model', label: 'Model' },
            { key: 'year', label: 'Year' },
            { key: 'license_plate', label: 'Plate' },
            { key: 'vehicle_type', label: 'Type' },
            { key: 'verification_status', label: 'Verification' }
        ];

        const table = new DataTable({
            columns,
            data: vehicleRows,
            actions: [
                { key: 'verify', label: 'Verify', className: 'success' },
                { key: 'reject', label: 'Reject', className: 'danger' },
                { key: 'view', label: 'View', className: 'secondary' }
            ],
            onAction: (action, id) => this.handleVehicleAction(action, id)
        });

        container.innerHTML = '';
        container.appendChild(table.render());
        this.vehicleTable = table;
    }

    renderRides(container) {
        this.sectionHeader(container, 'Ride Monitoring', 'Monitor active and recent rides with rich ride detail access.');

        container.innerHTML += `
            <div class="admin-section admin-section-fullwidth">
                <div id="admin-rides-table"></div>
            </div>
        `;

        this.buildRideTable();
    }

    buildRideTable() {
        const container = document.getElementById('admin-rides-table');
        const rideRows = mockRides.map(ride => {
            const rider = mockUsers.find(u => u.id === ride.rider_id) || {};
            const driver = mockUsers.find(u => u.id === (mockDrivers.find(d => d.id === ride.driver_id)?.user_id)) || {};
            const pickup = mockLocations.find(l => l.id === ride.pickup_location_id) || {};
            const dropoff = mockLocations.find(l => l.id === ride.dropoff_location_id) || {};
            return {
                id: ride.id,
                rider: rider.full_name || 'Unknown',
                driver: driver.full_name || 'Unassigned',
                pickup: pickup.address || 'TBD',
                dropoff: dropoff.address || 'TBD',
                status: ride.status,
                fare: ride.fare || 0,
                scheduled_time: ride.scheduled_time || ride.created_at
            };
        });

        const columns = [
            { key: 'id', label: 'Ride ID' },
            { key: 'rider', label: 'Rider' },
            { key: 'driver', label: 'Driver' },
            { key: 'pickup', label: 'Pickup' },
            { key: 'dropoff', label: 'Drop-off' },
            { key: 'status', label: 'Status' },
            { key: 'fare', label: 'Fare', type: 'currency' },
            { key: 'scheduled_time', label: 'Scheduled', type: 'datetime' }
        ];

        const table = new DataTable({
            columns,
            data: rideRows,
            actions: [
                { key: 'details', label: 'Details', className: 'secondary' }
            ],
            onAction: (action, id) => this.handleRideAction(action, id)
        });

        container.innerHTML = '';
        container.appendChild(table.render());
        this.rideTable = table;
    }

    renderComplaints(container) {
        this.sectionHeader(container, 'Complaint Management', 'Track, review, and resolve complaints with priority handling.');

        container.innerHTML += `
            <div class="admin-section admin-section-fullwidth">
                <div id="admin-complaints-table"></div>
            </div>
        `;

        this.buildComplaintTable();
    }

    buildComplaintTable() {
        const container = document.getElementById('admin-complaints-table');
        const complaintRows = mockComplaints.map(issue => {
            const filer = mockUsers.find(u => u.id === issue.filed_by) || {};
            return {
                id: issue.id,
                filed_by: filer.full_name || 'Unknown',
                ride_id: issue.ride_id,
                complaint_type: issue.complaint_type,
                description: issue.description,
                status: issue.status,
                submitted_at: issue.submitted_at
            };
        });

        const columns = [
            { key: 'id', label: 'Complaint ID' },
            { key: 'filed_by', label: 'Filed by' },
            { key: 'ride_id', label: 'Ride ID' },
            { key: 'complaint_type', label: 'Type' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status' },
            { key: 'submitted_at', label: 'Submitted', type: 'datetime' }
        ];

        const table = new DataTable({
            columns,
            data: complaintRows,
            actions: [
                { key: 'review', label: 'Review', className: 'primary' },
                { key: 'resolve', label: 'Resolve', className: 'success' },
                { key: 'escalate', label: 'Escalate', className: 'danger' }
            ],
            onAction: (action, id) => this.handleComplaintAction(action, id)
        });

        container.innerHTML = '';
        container.appendChild(table.render());
        this.complaintTable = table;
    }

    renderReports(container) {
        const totalRevenue = mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const revenueByMethod = mockPayments.reduce((acc, payment) => {
            acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
            return acc;
        }, {});
        const revenueByCity = mockRides.reduce((acc, ride) => {
            const pickup = mockLocations.find(l => l.id === ride.pickup_location_id)?.city || 'Unknown';
            acc[pickup] = (acc[pickup] || 0) + (ride.fare || 0);
            return acc;
        }, {});
        const complaintOverview = mockComplaints.reduce((acc, complaint) => {
            acc[complaint.status] = (acc[complaint.status] || 0) + 1;
            return acc;
        }, {});
        const driverReviewScores = mockRatings.filter(r => r.rated_by === 'Rider');
        const averageDriverRating = driverReviewScores.length ? (driverReviewScores.reduce((sum, r) => sum + r.score, 0) / driverReviewScores.length).toFixed(1) : 'N/A';
        const driverRatingsByDriver = driverReviewScores.reduce((acc, rating) => {
            const driver = mockUsers.find(u => u.id === rating.rated_user_id);
            const driverName = driver?.full_name || 'Unknown';
            if (!acc[driverName]) acc[driverName] = { total: 0, count: 0 };
            acc[driverName].total += rating.score;
            acc[driverName].count += 1;
            return acc;
        }, {});
        const topDrivers = Object.entries(driverRatingsByDriver)
            .map(([name, stats]) => ({ name, average: stats.total / stats.count, count: stats.count }))
            .sort((a, b) => b.average - a.average)
            .slice(0, 3);

        container.innerHTML = `
            <div class="admin-section admin-overview">
                <div class="admin-section-head">
                    <div>
                        <h2>Revenue & Reports</h2>
                        <p class="text-muted">Explore revenue breakdowns and generate export-ready insights.</p>
                    </div>
                </div>

                <div class="panel-card panel-card-compact">
                    <div class="panel-actions">
                        <div class="filter-group">
                            <label>Date range</label>
                            <input id="admin-report-start" type="date" />
                        </div>
                        <div class="filter-group">
                            <label>&nbsp;</label>
                            <input id="admin-report-end" type="date" />
                        </div>
                        <button class="btn btn-primary btn-sm" id="admin-report-apply">Apply</button>
                    </div>
                </div>

                <div class="admin-grid admin-grid-4" style="margin-top: 24px; gap:16px;">
                    <div class="stat-card stat-card-primary">
                        <div class="stat-card-title">Total Revenue</div>
                        <div class="stat-card-value">${formatCurrency(totalRevenue)}</div>
                    </div>
                    <div class="stat-card stat-card-success">
                        <div class="stat-card-title">Avg Driver Rating</div>
                        <div class="stat-card-value">${averageDriverRating} / 5</div>
                    </div>
                    <div class="stat-card stat-card-warning">
                        <div class="stat-card-title">Open Complaints</div>
                        <div class="stat-card-value">${complaintOverview.Open || 0}</div>
                    </div>
                    <div class="stat-card stat-card-info">
                        <div class="stat-card-title">Card Payments</div>
                        <div class="stat-card-value">${formatCurrency(revenueByMethod.Card || 0)}</div>
                    </div>
                </div>

                <div class="admin-grid admin-grid-2" style="margin-top: 24px; gap:16px;">
                    <div class="panel-card">
                        <div class="panel-header"><h3>Revenue by City</h3></div>
                        <div class="panel-body">
                            <div class="report-list">
                                ${Object.entries(revenueByCity).map(([city, amount]) => `
                                    <div class="report-list-item">
                                        <span>${city}</span>
                                        <strong>${formatCurrency(amount)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="panel-card">
                        <div class="panel-header"><h3>Complaint Status</h3></div>
                        <div class="panel-body">
                            ${Object.entries(complaintOverview).map(([status, count]) => `
                                <div class="report-list-item">
                                    <span>${status}</span>
                                    <strong>${count}</strong>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="panel-card" style="margin-top: 24px;">
                    <div class="panel-header"><h3>Top Drivers</h3></div>
                    <div class="panel-body">
                        ${topDrivers.length ? topDrivers.map(driver => `
                            <div class="report-list-item">
                                <span>${driver.name}</span>
                                <strong>${driver.average.toFixed(1)} / 5 (${driver.count} reviews)</strong>
                            </div>
                        `).join('') : '<p class="text-muted">No driver ratings available yet.</p>'}
                    </div>
                </div>

                <div class="panel-card" style="margin-top: 24px;">
                    <div class="panel-header"><h3>Report Preview</h3></div>
                    <div class="panel-body admin-report-placeholder">
                        <p>Summary cards and revenue charts will update after you apply a date range.</p>
                    </div>
                </div>
            </div>
        `;

        const startInput = document.getElementById('admin-report-start');
        const endInput = document.getElementById('admin-report-end');
        const today = new Date().toISOString().slice(0, 10);
        startInput.value = today;
        endInput.value = today;

        document.getElementById('admin-report-apply').addEventListener('click', () => {
            showToast('Report filters applied', 'success');
        });
    }

    sectionHeader(container, title, subtitle) {
        container.innerHTML = `
            <div class="admin-section-head">
                <div>
                    <h2>${title}</h2>
                    <p class="text-muted">${subtitle}</p>
                </div>
            </div>
        `;
    }

    handleUserAction(action, userId) {
        const user = mockUsers.find(u => u.id === userId);
        if (!user) return;

        if (action === 'view') {
            Modal.alert({
                title: `User details — ${user.full_name}`,
                message: `
                    <div style="text-align:left; font-size:14px; line-height:1.6;">
                        <p><strong>ID:</strong> ${user.id}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Phone:</strong> ${user.phone_number}</p>
                        <p><strong>Role:</strong> ${user.role}</p>
                        <p><strong>Status:</strong> ${user.account_status}</p>
                        <p><strong>Registered:</strong> ${formatAdminDate(user.registration_date)}</p>
                    </div>
                `
            });
        } else if (action === 'edit') {
            Modal.form({
                title: `Edit user — ${user.full_name}`,
                fields: [
                    { name: 'full_name', label: 'Full name', value: user.full_name },
                    { name: 'email', label: 'Email', type: 'email', value: user.email },
                    { name: 'phone_number', label: 'Phone', value: user.phone_number },
                    { name: 'account_status', label: 'Status', type: 'select', options: [
                        { value: 'Active', label: 'Active' },
                        { value: 'Suspended', label: 'Suspended' },
                        { value: 'Banned', label: 'Banned' }
                    ], value: user.account_status }
                ],
                submitLabel: 'Save changes',
                onSubmit: (data) => {
                    Object.assign(user, data);
                    showToast('User updated', 'success');
                    this.buildUserTable();
                }
            });
        } else if (action === 'suspend') {
            user.account_status = 'Suspended';
            showToast(`${user.full_name} suspended`, 'warning');
            this.buildUserTable();
        } else if (action === 'ban') {
            user.account_status = 'Banned';
            showToast(`${user.full_name} banned`, 'danger');
            this.buildUserTable();
        } else if (action === 'activate') {
            user.account_status = 'Active';
            showToast(`${user.full_name} activated`, 'success');
            this.buildUserTable();
        }
    }

    handleDriverAction(action, driverId) {
        const driver = mockDrivers.find(d => d.id === driverId);
        const user = mockUsers.find(u => u.id === driver?.user_id) || {};
        if (!driver) return;

        if (action === 'inspect') {
            Modal.alert({
                title: `Driver profile — ${user.full_name}`,
                message: `
                    <div style="text-align:left; font-size:14px; line-height:1.6;">
                        <p><strong>License:</strong> ${driver.license_number}</p>
                        <p><strong>CNIC:</strong> ${driver.cnic}</p>
                        <p><strong>Verification:</strong> ${driver.verification_status}</p>
                        <p><strong>Availability:</strong> ${driver.availability_status}</p>
                        <p><strong>Total trips:</strong> ${driver.total_trips}</p>
                        <p><strong>Rating:</strong> ${driver.average_rating}</p>
                    </div>
                `
            });
        } else if (action === 'verify') {
            driver.verification_status = 'Verified';
            showToast(`Driver ${user.full_name} verified`, 'success');
            this.buildDriversTable();
        } else if (action === 'reject') {
            driver.verification_status = 'Rejected';
            showToast(`Driver ${user.full_name} rejected`, 'danger');
            this.buildDriversTable();
        } else if (action === 'suspend') {
            const account = mockUsers.find(u => u.id === driver.user_id);
            if (account) account.account_status = 'Suspended';
            showToast(`${user.full_name} suspended`, 'warning');
            this.buildDriversTable();
        }
    }

    handleVehicleAction(action, vehicleId) {
        const vehicle = mockVehicles.find(v => v.id === vehicleId);
        const driver = mockDrivers.find(d => d.id === vehicle?.driver_id) || {};
        const user = mockUsers.find(u => u.id === driver.user_id) || {};
        if (!vehicle) return;

        if (action === 'view') {
            Modal.alert({
                title: `Vehicle details — ${vehicle.make} ${vehicle.model}`,
                message: `
                    <div style="text-align:left; font-size:14px; line-height:1.6;">
                        <p><strong>Driver:</strong> ${user.full_name}</p>
                        <p><strong>Plate:</strong> ${vehicle.license_plate}</p>
                        <p><strong>Year:</strong> ${vehicle.year}</p>
                        <p><strong>Type:</strong> ${vehicle.vehicle_type}</p>
                        <p><strong>Status:</strong> ${vehicle.verification_status}</p>
                    </div>
                `
            });
        } else if (action === 'verify') {
            vehicle.verification_status = 'Verified';
            showToast(`Vehicle ${vehicle.license_plate} verified`, 'success');
            this.buildVehicleTable();
        } else if (action === 'reject') {
            vehicle.verification_status = 'Rejected';
            showToast(`Vehicle ${vehicle.license_plate} rejected`, 'danger');
            this.buildVehicleTable();
        }
    }

    handleRideAction(action, rideId) {
        const ride = mockRides.find(r => r.id === rideId);
        if (!ride) return;
        const rider = mockUsers.find(u => u.id === ride.rider_id) || {};
        const driver = mockUsers.find(u => u.id === mockDrivers.find(d => d.id === ride.driver_id)?.user_id) || {};
        const pickup = mockLocations.find(l => l.id === ride.pickup_location_id) || {};
        const dropoff = mockLocations.find(l => l.id === ride.dropoff_location_id) || {};

        Modal.alert({
            title: `Ride details — #${ride.id}`,
            message: `
                <div style="text-align:left; font-size:14px; line-height:1.6;">
                    <p><strong>Rider:</strong> ${rider.full_name || 'Unknown'}</p>
                    <p><strong>Driver:</strong> ${driver.full_name || 'Unassigned'}</p>
                    <p><strong>Pickup:</strong> ${pickup.address || 'TBD'}</p>
                    <p><strong>Drop-off:</strong> ${dropoff.address || 'TBD'}</p>
                    <p><strong>Status:</strong> ${ride.status}</p>
                    <p><strong>Fare:</strong> ${formatCurrency(ride.fare || 0)}</p>
                    <p><strong>Scheduled:</strong> ${formatDateTimeAdmin(ride.scheduled_time || ride.created_at)}</p>
                </div>
            `
        });
    }

    handleComplaintAction(action, id) {
        const complaint = mockComplaints.find(item => item.id === id);
        if (!complaint) return;

        if (action === 'review') {
            Modal.alert({
                title: `Review complaint #${complaint.id}`,
                message: `
                    <div style="text-align:left; font-size:14px; line-height:1.6;">
                        <p><strong>Filed by:</strong> ${mockUsers.find(u => u.id === complaint.filed_by)?.full_name || 'Unknown'}</p>
                        <p><strong>Ride:</strong> ${complaint.ride_id}</p>
                        <p><strong>Type:</strong> ${complaint.complaint_type}</p>
                        <p><strong>Status:</strong> ${complaint.status}</p>
                        <p><strong>Description:</strong> ${complaint.description}</p>
                    </div>
                `
            });
        } else if (action === 'resolve') {
            complaint.status = 'Resolved';
            complaint.resolved_at = new Date().toISOString();
            showToast('Complaint resolved', 'success');
            this.buildComplaintTable();
        } else if (action === 'escalate') {
            complaint.status = 'In Review';
            showToast('Complaint escalated', 'warning');
            this.buildComplaintTable();
        }
    }
}

function totalRevenueByDateRange() {
    return mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
}

const adminDash = new AdminDashboardPage();
