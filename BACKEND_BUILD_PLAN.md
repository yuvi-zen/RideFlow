# RideFlow Backend & Database Build Plan

## Phase 1: Database Schema
**Goal**: Create a complete MySQL schema supporting all 7 modules

### Tables to Create (in dependency order):
1. `users` - Base user table (admin, rider, driver)
2. `drivers` - Driver-specific profile (extends users)
3. `locations` - Geographic locations/addresses
4. `vehicles` - Driver vehicles with type classification
5. `rides` - Core ride requests and lifecycle
6. `payments` - Payment records with method/status tracking
7. `ratings` - Mutual ratings after ride completion
8. `complaints` - Complaints filed by users
9. `promo_codes` - Discount codes with expiry/usage limits
10. `fare_rules` - Pricing rules by vehicle type
11. `driver_earnings` - Earnings ledger with commission tracking
12. `ride_history` - Archived completed/cancelled rides

### Key Constraints:
- **Primary Keys**: All tables need explicit PKs
- **Foreign Keys**: Enforce relationships
- **Unique Constraints**: email (users), license_plate (vehicles), code (promo_codes)
- **Check Constraints**: Status enums, ratings 1-5, role validation
- **Indexes**: email, phone_number, status, created_at for query performance

### Triggers Needed:
- `update_driver_average_rating` - recalc avg rating after new rating
- `archive_completed_ride` - move to ride_history when completed
- `flag_low_rated_driver` - set suspended flag when avg < 3.5

### Stored Procedures Needed:
- `calculate_fare()` - base + distance + duration + surge multiplier
- `get_available_drivers()` - drivers online, verified, with location filter
- `process_driver_payout()` - calculate net earnings after commission

---

## Phase 2: Backend Folder Structure
**Goal**: Organize backend for maintainability and scalability

```
backend/
├── .env                          # Config (create from .env.example)
├── server.js                     # Entry point (unchanged)
├── app.js                        # Express setup (enhanced)
├── config/
│   ├── db.js                     # MySQL pool (working)
│   ├── env.js                    # Env vars (working)
│   └── constants.js              # App constants (NEW)
├── controllers/                  # Business logic handlers
│   ├── authController.js         # Login/Register (rewrite for DB)
│   ├── userController.js         # User profile management
│   ├── driverController.js       # Driver operations
│   ├── vehicleController.js      # Vehicle management
│   ├── rideController.js         # Ride lifecycle
│   ├── paymentController.js      # Payment records
│   ├── ratingController.js       # Ratings/reviews
│   ├── complaintController.js    # Complaints
│   ├── adminController.js        # Admin reports/stats
│   └── healthController.js       # Health check (exists)
├── models/                       # Database access layer
│   ├── User.js                   # User CRUD + queries
│   ├── Driver.js                 # Driver profile operations
│   ├── Vehicle.js                # Vehicle CRUD
│   ├── Location.js               # Location CRUD
│   ├── Ride.js                   # Ride operations
│   ├── Payment.js                # Payment CRUD
│   ├── Rating.js                 # Rating CRUD
│   ├── Complaint.js              # Complaint CRUD
│   ├── PromoCode.js              # Promo code queries
│   ├── FareRule.js               # Fare rule queries
│   ├── DriverEarning.js          # Earnings queries
│   └── RideHistory.js            # Archive queries
├── routes/
│   ├── api.js                    # API router (enhanced)
│   ├── authRoutes.js             # Auth endpoints (rewrite)
│   ├── userRoutes.js             # User endpoints (NEW)
│   ├── driverRoutes.js           # Driver endpoints (NEW)
│   ├── vehicleRoutes.js          # Vehicle endpoints (NEW)
│   ├── rideRoutes.js             # Ride endpoints (NEW)
│   ├── paymentRoutes.js          # Payment endpoints (NEW)
│   ├── ratingRoutes.js           # Rating endpoints (NEW)
│   ├── complaintRoutes.js        # Complaint endpoints (NEW)
│   └── adminRoutes.js            # Admin endpoints (NEW)
├── middleware/
│   ├── authMiddleware.js         # JWT verification (NEW)
│   ├── roleMiddleware.js         # Role-based access (NEW)
│   ├── errorHandler.js           # Error handling (exists)
│   └── validateRequest.js        # Input validation (exists)
├── utils/
│   ├── jwt.js                    # JWT token utils (NEW)
│   ├── passwordHash.js           # Password hashing (NEW)
│   ├── fareCalculator.js         # Fare calculation logic (NEW)
│   ├── driverMatcher.js          # Driver selection logic (NEW)
│   ├── locationService.js        # Location/distance utils (NEW)
│   └── apiResponse.js            # Response formatting (exists)
└── database/
    └── schema.sql                # Complete schema (NEW)
```

---

## Phase 3: Database Connection & Setup
**Goal**: Create working MySQL connection and initialize schema

### Steps:
1. Create `backend/database/schema.sql` with all DDL
2. Create/update `.env` with real MySQL credentials
3. Verify connection in `config/db.js`
4. Run schema creation script
5. Seed demo data (optional but useful for testing)

---

## Phase 4: Authentication System
**Goal**: Real login/register with password hashing and JWT tokens

### Endpoints:
- `POST /api/auth/register` - Create user account, role selection
- `POST /api/auth/login` - Verify credentials, return JWT token
- `POST /api/auth/logout` - Invalidate token (optional)
- `GET /api/auth/profile` - Verify token, return user profile

### Features:
- bcryptjs for password hashing
- jsonwebtoken for JWT tokens
- Token expiry validation
- Role-based token claims

---

## Phase 5: Core Modules (in order)
**Goal**: Build API endpoints matching frontend structure

### 5.1 User Management
- GET /api/users/profile - Current user profile
- PUT /api/users/profile - Update profile
- GET /api/users/{id} - Get user by ID (admin only)
- GET /api/users?role=Rider - Get users by role (admin only)

### 5.2 Driver Management
- GET /api/drivers/profile - Current driver profile
- PUT /api/drivers/profile - Update driver details
- PUT /api/drivers/status - Toggle online/offline
- GET /api/drivers/{id} - Get driver profile (admin)
- GET /api/drivers/search?location=X - Find nearby drivers (rider)
- POST /api/drivers/{id}/verify - Verify driver (admin only)

### 5.3 Vehicle Management
- POST /api/vehicles - Register new vehicle
- GET /api/vehicles/{id} - Get vehicle details
- GET /api/drivers/{driverId}/vehicles - List driver's vehicles
- PUT /api/vehicles/{id} - Update vehicle
- DELETE /api/vehicles/{id} - Remove vehicle
- POST /api/vehicles/{id}/verify - Verify vehicle (admin)

### 5.4 Ride Management
- POST /api/rides - Request new ride
- GET /api/rides/{id} - Get ride details
- GET /api/rides/current - Get current active ride (rider/driver)
- GET /api/riders/{riderId}/rides - Ride history (rider)
- GET /api/drivers/{driverId}/rides - Ride history (driver)
- PUT /api/rides/{id}/status - Update ride status (accept/in-progress/complete/cancel)
- GET /api/rides?status=Requested - List rides by status (admin)

### 5.5 Payment Management
- POST /api/payments - Record payment
- GET /api/payments/{id} - Get payment details
- GET /api/riders/{riderId}/payments - Payment history (rider)
- GET /api/payments/reports - Revenue reports (admin)

### 5.6 Rating & Reviews
- POST /api/ratings - Submit rating
- GET /api/ratings/{rideId} - Get ratings for ride
- GET /api/users/{userId}/ratings - User average rating
- GET /api/drivers/leaderboard - Top-rated drivers by city

### 5.7 Complaints
- POST /api/complaints - File complaint
- GET /api/complaints/{id} - Get complaint details
- GET /api/complaints?status=Open - List complaints (admin)
- PUT /api/complaints/{id}/status - Update complaint status (admin)

### 5.8 Admin Reports
- GET /api/admin/stats - Dashboard stats (overview)
- GET /api/admin/revenue - Revenue by city/date
- GET /api/admin/earnings - Driver earnings summary
- GET /api/admin/payouts - Pending/completed payouts

---

## Phase 6: Middleware & Security
**Goal**: Implement authentication & authorization

### Middleware Chain:
1. `verifyToken()` - Check JWT validity
2. `checkRole(role)` - Verify user role matches requirement
3. `validateInput()` - Sanitize & validate request data
4. `errorHandler()` - Catch & format errors

---

## Phase 7: Testing & Integration Points
**Goal**: Prepare for frontend integration

### Frontend Integration Checklist:
- [ ] API_BASE_URL updated to `http://localhost:4000/api`
- [ ] Mock API calls switchable to real fetch
- [ ] Login redirect to correct dashboard
- [ ] Frontend can store JWT token
- [ ] All dashboard data loads from backend
- [ ] Form submissions save to database
- [ ] Logout clears token

---

## Implementation Order:
1. Database schema creation ✓ (this doc)
2. Backend folder structure & config
3. Models layer (database access)
4. Authentication (login/register)
5. User management APIs
6. Driver management APIs
7. Vehicle management APIs
8. Ride management APIs
9. Payment tracking
10. Ratings system
11. Complaints system
12. Admin reports
13. Middleware & security
14. Testing & documentation

---

## Success Criteria:
- ✓ All 12 tables exist with proper constraints
- ✓ Backend starts without errors
- ✓ Login endpoint works with real database
- ✓ All API endpoints return proper JSON
- ✓ Database queries work for all CRUD operations
- ✓ Role-based access control enforced
- ✓ Frontend can eventually switch from mock to real data
- ✓ Admin can view all data
- ✓ Riders can request and track rides
- ✓ Drivers can accept rides and track earnings
