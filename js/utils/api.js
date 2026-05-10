/**
 * API.js - API Communication Layer for RideFlow
 * Currently uses mock data but structured to easily switch to real MySQL APIs
 */

const API_BASE_URL = window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api';
console.log('API Client initialized with Base URL:', API_BASE_URL);

class APIClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
        this.timeout = 5000;
    }

    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            useMockData = false
        } = options;

        // If explicitly requested, return mock data
        if (useMockData) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return this.getMockResponse(endpoint, method, body);
        }

        try {
            const token = authStorage.getAuthToken();
            const finalHeaders = {
                'Content-Type': 'application/json',
                ...headers,
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            const config = {
                method,
                headers: finalHeaders,
            };

            if (body) {
                config.body = JSON.stringify(body);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch(`${this.baseURL}${endpoint}`, { ...config, signal: controller.signal });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (!response.ok) {
                const msg = data.message || data.error || `HTTP ${response.status}`;
                throw new Error(msg);
            }
            return data;
        } catch (error) {
            if (error.name === 'AbortError' || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                console.warn('[API] Backend unreachable, falling back to mock data for', endpoint);
                return this.getMockResponse(endpoint, method, body);
            }
            console.error('API Error:', error);
            throw error;
        }
    }

    getMockResponse(endpoint, method, body) {
        console.log(`[MOCK] ${method} ${endpoint}`, body);
        const path = endpoint.split('?')[0];
        const segments = path.split('/').filter(Boolean);
        
        // Auth endpoints
        if (segments[0] === 'auth') {
            if (path === '/auth/login' && body) {
                const user = mockUsers.find(u => u.email === body.email && u.password === body.password);
                if (user) {
                    return { success: true, data: { token: `mock_${user.id}`, user } };
                }
                return { success: false, message: 'Invalid email or password' };
            }
            if (path === '/auth/register' && body) {
                const newUser = { id: mockUsers.length + 1, ...body, account_status: 'Active', registration_date: new Date().toISOString() };
                mockUsers.push(newUser);
                return { success: true, data: { token: `mock_${newUser.id}`, user: newUser } };
            }
            if (path === '/auth/profile') {
                const tokenUser = authStorage.getCurrentUser();
                return { success: true, data: tokenUser || mockUsers[0] };
            }
        }
        
        // Users
        if (segments[0] === 'users') {
            if (segments.length === 1) {
                return { success: true, data: mockUsers, pagination: { page: 1, limit: 10, total: mockUsers.length } };
            }
            if (segments[1] && !isNaN(segments[1])) {
                const user = mockUsers.find(u => u.id == segments[1]);
                return { success: true, data: user || mockUsers[0] };
            }
        }
        
        // Drivers
        if (segments[0] === 'drivers') {
            if (segments[1] === 'available') {
                return { success: true, data: mockDrivers.filter(d => d.availability_status === 'Online') };
            }
            if (segments[1] && !isNaN(segments[1])) {
                const driver = mockDrivers.find(d => d.id == segments[1]);
                return { success: true, data: driver || mockDrivers[0] };
            }
        }
        
        // Rides
        if (segments[0] === 'rides') {
            if (segments.length === 1) {
                return { success: true, data: mockRides };
            }
            if (segments[2] === 'user') {
                const rides = mockRides.filter(r => r.rider_id == segments[3]);
                return { success: true, data: rides };
            }
            if (segments[1] && !isNaN(segments[1])) {
                const ride = mockRides.find(r => r.id == segments[1]);
                return { success: true, data: ride || mockRides[0] };
            }
        }
        
        // Vehicles
        if (segments[0] === 'vehicles') {
            if (segments[1] === 'driver') {
                return { success: true, data: mockVehicles.filter(v => v.driver_id == segments[2]) };
            }
            return { success: true, data: mockVehicles };
        }
        
        // Payments
        if (segments[0] === 'payments') {
            if (segments[1] === 'wallet') return { success: true, data: { balance: 5000 } };
            if (segments[1] === 'promos') return { success: true, data: mockPromoCodes.filter(p => p.is_active) };
            if (segments[1] === 'driver-earnings' || segments[1] === 'earnings') {
                return { success: true, data: { total: 12500, avg_per_ride: 280, ride_count: 45 } };
            }
            return { success: true, data: mockPayments };
        }
        
        // Complaints
        if (segments[0] === 'complaints') {
            return { success: true, data: mockComplaints };
        }
        
        // Ratings
        if (segments[0] === 'ratings') {
            return { success: true, data: mockRatings };
        }
        
        // Reports
        if (segments[0] === 'reports') {
            return { success: true, data: { totalUsers: mockUsers.length, totalRides: mockRides.length, totalRevenue: 250000, totalComplaints: mockComplaints.length } };
        }
        
        return { success: true, data: [] };
    }

    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}

const apiClient = new APIClient();

// ==================== AUTHENTICATION ENDPOINTS ====================

// Decode JWT payload without external library
function decodeJWTPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonPayload);
    } catch { return null; }
}

const authAPI = {
    async login(email, password) {
        const res = await apiClient.post('/auth/login', { email, password });
        if (res.success && res.data) {
            const { token, user } = res.data;
            // If user object missing role, extract from JWT payload
            if (user && !user.role && token) {
                const payload = decodeJWTPayload(token);
                if (payload && payload.role) user.role = payload.role;
            }
            authStorage.setAuthToken(token);
            authStorage.setCurrentUser(user);
            return { success: true, token, user };
        }
        throw new Error(res.message || 'Login failed');
    },

    async register(userData) {
        const res = await apiClient.post('/auth/register', userData);
        if (res.success && res.data) {
            const { token, user } = res.data;
            if (user && !user.role && token) {
                const payload = decodeJWTPayload(token);
                if (payload && payload.role) user.role = payload.role;
            }
            authStorage.setAuthToken(token);
            authStorage.setCurrentUser(user);
            return { success: true, token, user };
        }
        throw new Error(res.message || 'Registration failed');
    },

    async logout() {
        authStorage.logout();
        return { success: true };
    },

    async forgotPassword(email) {
        return apiClient.post('/auth/forgot-password', { email });
    },

    async resetPassword(token, newPassword) {
        return apiClient.post('/auth/reset-password', { token, newPassword });
    },

    async getProfile() {
        return apiClient.get('/auth/profile');
    },

    async updateProfile(data) {
        return apiClient.put('/auth/profile', data);
    }
};

// ==================== USER ENDPOINTS ====================

const userAPI = {
    async getProfile(userId) {
        return apiClient.get(`/users/${userId}`);
    },

    async updateProfile(userId, userData) {
        return apiClient.put(`/users/${userId}/profile`, userData);
    },

    async getAllUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiClient.get(`/users?${query}`);
    },

    async getUsersByRole(role) {
        return apiClient.get(`/users?role=${encodeURIComponent(role)}`);
    },

    async searchUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return apiClient.get(`/users/search?${query}`);
    }
};

// ==================== RIDER ENDPOINTS ====================

const riderAPI = {
    async requestRide(rideData) {
        return apiClient.post('/rides', rideData);
    },

    async getRideHistory(riderId) {
        return apiClient.get(`/rides/user/${riderId}`);
    },

    async getCurrentRide(riderId) {
        const res = await apiClient.get(`/rides/user/${riderId}?status=active`);
        // Return first active ride if any
        const rides = res.data || [];
        const active = rides.find(r => ['Requested','Accepted','Driver En Route','In Progress'].includes(r.status));
        return { success: true, data: active || null };
    },

    async cancelRide(rideId) {
        return apiClient.put(`/rides/${rideId}/cancel`, { reason: 'Cancelled by rider' });
    },

    async rateRide(rideId, ratingData) {
        return apiClient.post('/ratings', { ride_id: rideId, ...ratingData });
    },

    async fileComplaint(complaintData) {
        return apiClient.post('/complaints', complaintData);
    }
};

// ==================== DRIVER ENDPOINTS ====================

const driverAPI = {
    async getDriverProfile(driverId) {
        return apiClient.get(`/drivers/${driverId}`);
    },

    async getProfileByUserId(userId) {
        return apiClient.get(`/drivers/user/${userId}`);
    },

    async updateDriverStatus(driverId, status) {
        return apiClient.put(`/drivers/${driverId}/availability`, { availability_status: status });
    },

    async getIncomingRides(driverId) {
        return apiClient.get('/rides?status=Requested');
    },

    async acceptRide(rideId, driverId, vehicleId) {
        return apiClient.put(`/rides/${rideId}/accept`, { driver_id: driverId, vehicle_id: vehicleId });
    },

    async rejectRide(rideId) {
        return apiClient.put(`/rides/${rideId}/reject`, {});
    },

    async completeRide(rideId) {
        return apiClient.put(`/rides/${rideId}/complete`, {});
    },

    async getEarnings(driverId) {
        return apiClient.get(`/payments/driver-earnings?driver_id=${driverId}`);
    },

    async getVehicles(driverId) {
        return apiClient.get(`/vehicles/driver/${driverId}`);
    },

    async requestPayout(driverId) {
        return apiClient.post('/payments/payout', { driver_id: driverId });
    }
};

// ==================== PAYMENT ENDPOINTS ====================

const paymentAPI = {
    async processPayment(paymentData) {
        return apiClient.post('/payments', paymentData);
    },

    async getPaymentHistory(userId) {
        return apiClient.get(`/payments?user_id=${userId}`);
    },

    async getWalletBalance(userId) {
        return apiClient.get(`/payments/wallet?user_id=${userId}`);
    }
};

// ==================== ADMIN ENDPOINTS ====================

const adminAPI = {
    async getDashboardStats() {
        return apiClient.get('/reports/platform-health');
    },

    async getUsers() {
        return apiClient.get('/users');
    },

    async verifyDriver(driverId, status) {
        return apiClient.put(`/drivers/${driverId}/verify`, { status });
    },

    async verifyVehicle(vehicleId, status) {
        return apiClient.put(`/vehicles/${vehicleId}/verify`, { status });
    },

    async getComplaints() {
        return apiClient.get('/complaints');
    },

    async resolveComplaint(complaintId, resolution) {
        return apiClient.put(`/complaints/${complaintId}/status`, { status: 'Resolved', resolution });
    },

    async generateReport(reportType, filters) {
        const query = new URLSearchParams(filters).toString();
        return apiClient.get(`/reports/${reportType}?${query}`);
    }
};

// ==================== LOCATION ENDPOINTS ====================

const locationAPI = {
    async searchLocations(query) {
        return apiClient.get(`/rides/estimate?query=${encodeURIComponent(query)}`);
    },

    async getNearbyDrivers(latitude, longitude, radius = 5) {
        return apiClient.get(`/drivers/available?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    }
};

// ==================== PROMO CODE ENDPOINTS ====================

const promoAPI = {
    async validatePromoCode(code) {
        return apiClient.post('/payments/apply-promo', { code });
    },

    async getAvailablePromoCodes() {
        return apiClient.get('/payments/promos');
    }
};

// Export all APIs
window.authAPI = authAPI;
window.userAPI = userAPI;
window.riderAPI = riderAPI;
window.driverAPI = driverAPI;
window.paymentAPI = paymentAPI;
window.adminAPI = adminAPI;
window.locationAPI = locationAPI;
window.promoAPI = promoAPI;
