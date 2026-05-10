# RideFlow Phase 2 - Business Logic Implementation Plan

**Status**: Ready to Implement  
**Date**: May 8, 2026  
**Scope**: 8 Core Business Logic Modules  
**Estimated Duration**: 6-8 hours  
**Pattern**: Consistent with Phase 1 MVC architecture

---

## 📋 Module Implementation Order

### Tier 1 (Foundational - Must be first)
1. **User Management** - User CRUD operations, profile management
2. **Driver Management** - Driver profile, verification, availability
3. **Vehicle Management** - Vehicle registration, verification

### Tier 2 (Core Features)
4. **Ride Management** - Most complex, depends on users/drivers/vehicles
5. **Payment Processing** - Payment records, calculation
6. **Ratings System** - Mutual ratings after rides

### Tier 3 (Support & Analytics)
7. **Complaints System** - Issue tracking and resolution
8. **Admin Reports** - Dashboard analytics and insights

---

## 📊 Module Details & API Endpoints

### 1. USER MANAGEMENT MODULE
**Purpose**: User profile, account status, admin user controls  
**Files to Create**: 3 files

#### Endpoints (7 total)
```
GET    /api/users/:id                          - Get user profile
GET    /api/users?role=Rider&limit=10&offset=0 - List users (admin)
PUT    /api/users/:id/profile                  - Update own profile
PUT    /api/users/:id/status                   - Change account status (admin)
GET    /api/users/stats/summary                - User statistics (admin)
DELETE /api/users/:id                          - Delete user (admin)
GET    /api/users/search?email=test@...        - Search users (admin)
```

#### Database Access
- Read: users table
- Update: users table (account_status, profile fields)
- Aggregation: count users by role, status

#### Key Validations
- User ID format
- New status must be valid (Active/Suspended/Deleted)
- Admin-only operations
- Own profile vs admin operations

---

### 2. DRIVER MANAGEMENT MODULE
**Purpose**: Driver profiles, verification, availability, ratings  
**Files to Create**: 3 files

#### Endpoints (9 total)
```
GET    /api/drivers/:id                        - Get driver profile
PUT    /api/drivers/:id/profile                - Update driver profile
PUT    /api/drivers/:id/availability           - Toggle availability
PUT    /api/drivers/:id/verify                 - Verify driver (admin)
PUT    /api/drivers/:id/reject                 - Reject driver (admin)
GET    /api/drivers/:id/stats                  - Driver statistics
GET    /api/drivers/:id/ratings                - Driver ratings summary
GET    /api/drivers/available?lat=...&lng=...  - Find available drivers nearby
GET    /api/drivers?limit=10&offset=0          - List drivers (admin)
```

#### Database Access
- Read: drivers, users, ratings tables
- Update: drivers table (availability, status, license fields)
- Aggregation: average ratings, trip counts, earnings

#### Key Validations
- Driver ID must exist
- License plate format
- Availability toggle (true/false)
- Coordinates for location search
- Admin-only verification

---

### 3. VEHICLE MANAGEMENT MODULE
**Purpose**: Vehicle registration, verification, management  
**Files to Create**: 3 files

#### Endpoints (8 total)
```
POST   /api/vehicles                           - Register new vehicle
GET    /api/vehicles/:id                       - Get vehicle details
PUT    /api/vehicles/:id                       - Update vehicle details
DELETE /api/vehicles/:id                       - Delete vehicle
GET    /api/vehicles/driver/:driverId          - List driver's vehicles
GET    /api/vehicles?status=Pending&limit=10   - List vehicles for admin review
PUT    /api/vehicles/:id/verify                - Verify vehicle (admin)
PUT    /api/vehicles/:id/reject                - Reject vehicle (admin)
```

#### Database Access
- Create: vehicles table
- Read: vehicles, drivers tables
- Update: vehicles table (status, details)
- Delete: vehicles table (soft or hard delete)

#### Key Validations
- Driver exists and is a Driver role
- License plate uniqueness
- Vehicle type in enum (Sedan, SUV, etc)
- Color and manufacturer not empty
- Year valid (1990-current year)
- Admin-only verification

---

### 4. RIDE MANAGEMENT MODULE (MOST COMPLEX)
**Purpose**: Ride request, matching, tracking, completion, history  
**Files to Create**: 4 files (model, service, controller, routes)

#### Endpoints (12 total)
```
POST   /api/rides                              - Request new ride
GET    /api/rides/:id                          - Get ride details
GET    /api/rides?status=Active&limit=10       - List rides (filtered)
PUT    /api/rides/:id/accept                   - Driver accepts ride
PUT    /api/rides/:id/reject                   - Driver rejects ride
PUT    /api/rides/:id/start                    - Driver starts ride
PUT    /api/rides/:id/complete                 - Driver completes ride
PUT    /api/rides/:id/cancel                   - Cancel ride
GET    /api/rides/user/:userId                 - Rider's ride history
GET    /api/rides/driver/:driverId             - Driver's completed rides
GET    /api/rides/:id/timeline                 - Ride status timeline
PUT    /api/rides/:id/location                 - Update current location
```

#### Database Access
- Create: rides table
- Read: rides, users, drivers, vehicles, locations tables
- Update: rides table (status, location, driver assignment)
- Join: Complex queries for ride history with user/driver info
- Call procedure: `get_available_drivers()` for matching

#### Key Features
- Ride status workflow (Requested → Accepted → Started → Completed)
- Driver matching algorithm (find available drivers by location)
- Location tracking updates
- Ride history with pagination

#### Key Validations
- Pickup/dropoff locations exist
- Rider and driver different users
- Ride status transitions valid
- Driver available when accepting
- Only creator can cancel pending rides

---

### 5. PAYMENT PROCESSING MODULE
**Purpose**: Payment records, calculations, promo codes, refunds  
**Files to Create**: 4 files (model, service, controller, routes)

#### Endpoints (9 total)
```
POST   /api/payments/ride/:rideId               - Create payment for ride
GET    /api/payments/:id                        - Get payment details
GET    /api/payments/user/:userId               - User payment history
GET    /api/payments/driver/:driverId           - Driver earnings
PUT    /api/payments/:id/apply-promo            - Apply promo code
PUT    /api/payments/:id/mark-paid              - Mark as paid
PUT    /api/payments/:id/mark-failed            - Mark as failed
PUT    /api/payments/:id/refund                 - Issue refund
GET    /api/payments?method=Card&limit=10       - Payment history (admin)
```

#### Database Access
- Create: payments table
- Read: payments, rides, users, promo_codes, fare_rules tables
- Update: payments table (status, promo application, refund flag)
- Aggregate: earnings by driver, revenue by city/method
- Call procedure: `calculate_fare()` for fare computation

#### Key Features
- Fare calculation with surge pricing
- Promo code application and validation
- Multiple payment methods
- Refund processing
- Payment status tracking (Pending, Paid, Failed, Refunded)

#### Key Validations
- Ride exists and completed
- Promo code valid and applicable
- Payment method in enum
- Amount matches calculation
- Only creator can refund

---

### 6. RATINGS SYSTEM MODULE
**Purpose**: Mutual ratings, driver reputation, quality control  
**Files to Create**: 3 files

#### Endpoints (8 total)
```
POST   /api/ratings                            - Submit rating
GET    /api/ratings/:id                        - Get rating details
GET    /api/ratings/driver/:driverId           - Get driver ratings
GET    /api/ratings/user/:userId               - Get user ratings received
PUT    /api/ratings/:id/flag                   - Flag inappropriate rating
GET    /api/ratings/leaderboard?limit=10       - Top-rated drivers
GET    /api/ratings/summary/:driverId          - Driver rating summary
DELETE /api/ratings/:id                        - Delete own rating
```

#### Database Access
- Create: ratings table
- Read: ratings, users, drivers, rides tables
- Update: ratings table (flag status)
- Delete: ratings table
- Aggregate: average rating, review count

#### Key Features
- Bidirectional ratings (driver→rider, rider→driver)
- Rating comments and stars (1-5)
- Flagging inappropriate reviews
- Auto-update driver average (via trigger)
- Leaderboard generation

#### Key Validations
- Ride exists and completed
- Rater and ratee different
- Rating scale 1-5
- Comment length limits
- Only rater can delete own rating

---

### 7. COMPLAINTS SYSTEM MODULE
**Purpose**: Support tickets, issue resolution, tracking  
**Files to Create**: 3 files

#### Endpoints (8 total)
```
POST   /api/complaints                         - File complaint
GET    /api/complaints/:id                     - Get complaint details
GET    /api/complaints/user/:userId            - User's complaints
GET    /api/complaints/driver/:driverId        - Complaints against driver
GET    /api/complaints?status=Open&limit=10    - List complaints (admin)
PUT    /api/complaints/:id/status              - Update complaint status
PUT    /api/complaints/:id/resolution          - Add admin resolution
DELETE /api/complaints/:id                     - Delete complaint (user)
```

#### Database Access
- Create: complaints table
- Read: complaints, users, rides tables
- Update: complaints table (status, resolution)
- Delete: complaints table

#### Key Features
- Complaint categories
- Status tracking (Open, In Progress, Resolved, Closed)
- Admin resolution notes
- Attachment support (URLs)
- User and driver visibility based on role

#### Key Validations
- Ride exists (if complaint is ride-related)
- User involved in ride
- Status transitions valid
- Only creator can delete before resolution
- Only admin can add resolution

---

### 8. ADMIN REPORTS MODULE
**Purpose**: Analytics, dashboards, business intelligence  
**Files to Create**: 2 files (controller, routes)

#### Endpoints (10 total)
```
GET    /api/reports/revenue?start_date=...&end_date=...  - Revenue by date
GET    /api/reports/revenue-by-method                     - Revenue by payment method
GET    /api/reports/revenue-by-city                       - Revenue by city
GET    /api/reports/driver-earnings?limit=10              - Driver earnings summary
GET    /api/reports/ride-stats?period=monthly             - Ride completion stats
GET    /api/reports/cancellation-reasons                  - Cancellation analysis
GET    /api/reports/complaints-summary                    - Complaint analytics
GET    /api/reports/top-drivers?limit=10                  - Top-rated drivers
GET    /api/reports/new-users?days=30                     - New user signups
GET    /api/reports/platform-health                       - Overall platform metrics
```

#### Database Access
- Read: payments, rides, drivers, users, ratings, complaints, complaints_resolved tables
- Complex aggregations and GROUP BY queries
- Date range filtering
- No writes (reports only)

#### Key Features
- Date range filtering
- Multiple aggregation levels
- Pagination for large datasets
- Caching potential (reports don't change often)
- CSV export ready (endpoint returns JSON for CSV generation)

#### Key Validations
- Admin-only access
- Valid date ranges
- Limit/offset for pagination
- Period parameter validation (daily, weekly, monthly)

---

## 📁 Files to Create (Total: 29 files)

```
backend/models/
├── userModel.js                    (6 functions)
├── driverModel.js                  (8 functions)
├── vehicleModel.js                 (7 functions)
├── rideModel.js                    (12 functions)
├── paymentModel.js                 (10 functions)
├── ratingModel.js                  (7 functions)
├── complaintModel.js               (7 functions)
└── reportModel.js                  (10 functions - read-only)

backend/controllers/
├── userController.js               (7 functions)
├── driverController.js             (9 functions)
├── vehicleController.js            (8 functions)
├── rideController.js               (12 functions)
├── paymentController.js            (9 functions)
├── ratingController.js             (8 functions)
├── complaintController.js          (8 functions)
└── reportController.js             (10 functions)

backend/routes/
├── userRoutes.js
├── driverRoutes.js
├── vehicleRoutes.js
├── rideRoutes.js
├── paymentRoutes.js
├── ratingRoutes.js
├── complaintRoutes.js
└── reportRoutes.js

backend/services/
└── rideMatchingService.js          (driver matching logic)
```

---

## 🔄 Implementation Dependencies

```
authController (Phase 1)
    ↓
userModel, userController, userRoutes (Phase 2.1)
    ↓
driverModel, driverController, driverRoutes (Phase 2.2)
    ↓
vehicleModel, vehicleController, vehicleRoutes (Phase 2.3)
    ↓
rideModel, rideMatchingService, rideController, rideRoutes (Phase 2.4)
    ↓
paymentModel, paymentController, paymentRoutes (Phase 2.5)
    ↓
ratingModel, ratingController, ratingRoutes (Phase 2.6)
    ↓
complaintModel, complaintController, complaintRoutes (Phase 2.7)
    ↓
reportModel, reportController, reportRoutes (Phase 2.8)
```

---

## ✅ Checklist for Each Module

For each module, ensure:
- [ ] Model file with all CRUD operations
- [ ] Controller file with all business logic
- [ ] Routes file with validation and middleware
- [ ] All endpoints handle auth/role properly
- [ ] All inputs validated
- [ ] All errors handled
- [ ] Response format consistent
- [ ] Error messages clear
- [ ] Database queries optimized
- [ ] Comments explaining logic

---

## 🎯 Success Criteria

After Phase 2 completion:
- [ ] All 8 modules fully implemented
- [ ] 61+ API endpoints available
- [ ] Frontend can switch from mock to real data
- [ ] All business logic working
- [ ] Proper role-based access control
- [ ] Comprehensive error handling
- [ ] Database schema fully utilized
- [ ] No breaking changes to existing auth
- [ ] Ready for Phase 3 integration testing

---

## 🔐 Security Requirements

For all modules:
- ✅ JWT authentication required (use authMiddleware)
- ✅ Role-based access control (use roleMiddleware)
- ✅ Input validation (use express-validator)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Consistent error responses (use apiResponse utilities)
- ✅ No sensitive data in logs
- ✅ Status code compliance (201/400/401/403/404/500)

---

## 📚 Code Patterns to Follow

### Pattern 1: Model Query
```javascript
async function queryName(param) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT * FROM table WHERE id = ?',
      [param]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}
```

### Pattern 2: Controller Handler
```javascript
async function handlerName(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors.array());
    }
    
    const result = await Model.query(req.params.id);
    if (!result) {
      return errorResponse(res, 'Not found', 404);
    }
    
    return successResponse(res, result, 'Success message', 200);
  } catch (error) {
    next(error);
  }
}
```

### Pattern 3: Routes Definition
```javascript
router.get(
  '/:id',
  authMiddleware,
  param('id').isInt().toInt(),
  Controller.getById
);
```

---

## 🚀 Ready to Start

All prerequisite systems are in place:
- ✅ Database schema complete
- ✅ Authentication working
- ✅ Middleware available
- ✅ Utility functions ready
- ✅ Error handling patterns established
- ✅ Response format standardized
- ✅ Validation framework available

**Proceeding with User Management module first...**
