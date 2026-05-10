# Frontend-Backend Integration Guide

## Overview

This guide explains how the existing RideFlow frontend will connect to the new backend and database layer.

## Current State

**Frontend**: ✅ Complete with mock data
- All UI pages and dashboards built
- Routing working perfectly
- Mock API layer in place
- localStorage for session management

**Backend**: ✅ Phase 1 Complete
- Database schema created
- Authentication endpoints working
- Ready for integration

---

## How Frontend Currently Works

### Authentication Flow (Current - Mock)

```
1. User enters credentials → Login form (auth.js)
   ↓
2. Form submits → authAPI.login(email, password) [api.js]
   ↓
3. Searches mockUsers array for matching credentials
   ↓
4. Creates fake token → Stores in localStorage
   ↓
5. Redirects to dashboard based on role
```

### Dashboard Data Flow (Current - Mock)

```
1. Dashboard renders
   ↓
2. Accesses mockRides, mockDrivers, etc. from mock-data.js
   ↓
3. All changes stay in memory only (no persistence)
```

---

## Integration Steps (When Phase 2 is Complete)

### Step 1: Update API Configuration

**File**: `js/utils/api.js`

**Before (Current - Mock)**:
```javascript
const API_BASE_URL = 'http://localhost:3000/api'; // Wrong port

const authAPI = {
    async login(email, password) {
        // Mock implementation - returns mock user
        const user = mockUsers.find(u => u.email === email && u.password === password);
        // ... mock logic ...
    }
};
```

**After (With Real Backend)**:
```javascript
const API_BASE_URL = 'http://localhost:4000/api'; // Correct backend port

const authAPI = {
    async login(email, password) {
        return apiClient.post('/auth/login', {
            email,
            password
        });
    }
};
```

### Step 2: Update Mock Data Switch

**File**: `js/utils/api.js`

**Before**:
```javascript
async request(endpoint, options = {}) {
    const {
        method = 'GET',
        body = null,
        useMockData = true  // ← Always true currently
    } = options;
    
    if (useMockData) {
        // Return mock responses
    }
}
```

**After**:
```javascript
async request(endpoint, options = {}) {
    const {
        method = 'GET',
        body = null,
        useMockData = false  // ← Change to false
    } = options;
    
    if (useMockData) {
        // Fallback to mock if backend unavailable
    } else {
        // Make real API calls
        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        return await response.json();
    }
}
```

### Step 3: Update Login Handler

**File**: `js/pages/auth.js`

The login handler will work the same because it already calls `authAPI.login()`:

```javascript
const response = await authAPI.login(email, password);

if (response.success) {
    // Save token and user
    authStorage.setAuthToken(response.data.token);
    authStorage.setCurrentUser(response.data.user);
    
    // Redirect to dashboard
    const dashboardPage = response.data.user.role === 'Admin' ? '#admin-dashboard' : 
                         response.data.user.role === 'Rider' ? '#rider-dashboard' : 
                         '#driver-dashboard';
    navigateTo(dashboardPage);
}
```

### Step 4: Update Auth Header for API Calls

**File**: `js/utils/api.js`

Already implemented - just verify it's working:
```javascript
async request(endpoint, options = {}) {
    const token = authStorage.getAuthToken();
    const finalHeaders = {
        'Content-Type': 'application/json',
        ...headers,
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
    // ↑ This automatically adds JWT token to all requests
}
```

### Step 5: Update Dashboard Data Loading

**Example for Rider Dashboard** (`js/pages/rider-dashboard.js`):

**Before (Current - Mock)**:
```javascript
async render() {
    // Uses hardcoded mockUsers, mockRides, mockDrivers
    const allTrips = mockRides.filter(r => r.rider_id === this.currentUser.id);
}
```

**After (With Real Backend)**:
```javascript
async render() {
    // Load from backend
    try {
        const response = await riderAPI.getRideHistory(this.currentUser.id);
        const allTrips = response.data; // Real data from database
    } catch (error) {
        showToast('Failed to load rides', 'error');
    }
}
```

---

## API Endpoints the Frontend Will Use

### Phase 1 (Currently Available)

```
POST   /api/auth/register      - Create account ✅
POST   /api/auth/login         - Login user ✅
GET    /api/auth/profile       - Get profile ✅
PUT    /api/auth/profile       - Update profile ✅
POST   /api/auth/logout        - Logout ✅
```

### Phase 2 (To Be Implemented)

```
RIDER ENDPOINTS:
POST   /api/rides              - Request ride
GET    /api/riders/{id}/current-ride
GET    /api/riders/{id}/rides
GET    /api/riders/{id}/payments
POST   /api/ratings            - Submit rating
POST   /api/complaints         - File complaint

DRIVER ENDPOINTS:
GET    /api/drivers/profile
PUT    /api/drivers/profile
PUT    /api/drivers/status     - Go online/offline
POST   /api/vehicles           - Register vehicle
GET    /api/vehicles           - List vehicles
PUT    /api/rides/{id}/accept  - Accept ride request
PUT    /api/rides/{id}/status  - Update ride status
GET    /api/drivers/{id}/rides
GET    /api/drivers/{id}/earnings

ADMIN ENDPOINTS:
GET    /api/users              - List all users
GET    /api/drivers            - List drivers
GET    /api/vehicles           - List vehicles
GET    /api/rides              - List all rides
GET    /api/admin/stats        - Dashboard statistics
GET    /api/admin/revenue      - Revenue reports
```

---

## Testing Integration

### Test 1: Verify Backend is Running

```bash
curl http://localhost:4000/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "RideFlow API is running"
}
```

### Test 2: Test Login Endpoint

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rider@rideflow.com", "password": "Rider@123"}'
```

### Test 3: Test Frontend Login Flow

1. Open browser console
2. Go to `#login`
3. Try login with `rider@rideflow.com` / `Rider@123`
4. Should redirect to rider dashboard with real data

---

## Response Format Reference

All backend endpoints return this format:

```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": {...},
  "timestamp": "ISO-8601 timestamp"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "timestamp": "ISO-8601 timestamp"
}
```

---

## Security Considerations

### Token Storage
- Currently: localStorage (fine for development)
- Production: Consider httpOnly cookies or secure storage

### Token Validation
- Frontend validates token exists
- Backend validates token signature
- Token expires after 24 hours

### Role-Based UI
- Frontend shows UI based on stored role
- Backend validates role on protected routes
- Double validation for security

---

## Debugging Integration Issues

### Issue: "CORS error"
**Solution**: Backend already sends CORS headers
```javascript
// In app.js
res.header('Access-Control-Allow-Origin', '*');
```

### Issue: "401 Unauthorized"
**Solution**: Token missing or invalid
- Check localStorage has `rideflow_authToken`
- Verify token is sent in Authorization header

### Issue: "Database connection error"
**Solution**: MySQL not running or credentials wrong
- Check `.env` file
- Verify MySQL is running
- Test with `mysql -u root rideflow`

### Issue: "Endpoint not found"
**Solution**: Endpoint not yet implemented in Phase 2
- Check `BACKEND_PHASE1_COMPLETE.md` for status
- Phase 2 endpoints pending

---

## Frontend Code Changes Checklist

When Phase 2 is complete, make these changes:

- [ ] Update `API_BASE_URL` in `js/utils/api.js`
- [ ] Change `useMockData = false` in api.js
- [ ] Update all API calls to use new endpoints
- [ ] Test login flow
- [ ] Test dashboard data loading
- [ ] Test form submissions
- [ ] Remove mock data dependency (optional - keep as fallback)

---

## Example: Converting One API Call

### Current (Mock) - Rider requesting a ride

**File**: `js/pages/rider-dashboard.js`

```javascript
// Current mock implementation
async requestRide() {
    const newRide = {
        id: Math.max(...mockRides.map(r => r.id)) + 1,
        rider_id: this.currentUser.id,
        pickup_location_id: this.selectedPickup,
        dropoff_location_id: this.selectedDropoff,
        status: 'Requested',
        fare: null
    };
    
    mockRides.push(newRide);
    showToast('Ride requested!', 'success');
}
```

### After (Real Backend)

```javascript
// Real implementation
async requestRide() {
    try {
        const response = await riderAPI.requestRide({
            pickup_location_id: this.selectedPickup,
            dropoff_location_id: this.selectedDropoff,
            vehicle_type: this.selectedVehicleType,
            promo_code: this.selectedPromo
        });
        
        if (response.success) {
            this.currentRide = response.data;
            showToast('Ride requested! Searching for drivers...', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to request ride', 'error');
    }
}
```

---

## Timeline

| Phase | Component | Status | Estimated Time |
|-------|-----------|--------|-----------------|
| 1 | Database + Auth | ✅ Complete | Done |
| 2 | Core Modules | 🔄 Next | 4-6 hours |
| 3 | Integration | ⏳ After Phase 2 | 2-3 hours |
| 4 | Testing | ⏳ Final | 2-3 hours |

---

## Next: What Will Phase 2 Look Like?

Phase 2 will add all the business logic modules:

1. **User Management** - Admin user controls
2. **Driver Management** - Profile, verification, status
3. **Vehicle Management** - Registration and verification
4. **Ride Management** - Request, accept, track, complete
5. **Payment Management** - Track payments
6. **Ratings** - Mutual rating system
7. **Complaints** - Support system
8. **Admin Reports** - Dashboard analytics

Each module will follow the same pattern:
- Database model (CRUD operations)
- Controller (business logic)
- Routes (API endpoints)
- Middleware (validation, authorization)

---

## Support

For questions during integration:
- Check `BACKEND_SETUP.md` for backend details
- Check `BACKEND_PHASE1_COMPLETE.md` for what's done
- Check `js/utils/api.js` for frontend API structure
- Refer to `backend/database/schema.sql` for data structure
