# RideFlow Backend Setup Guide

## Overview

This guide walks you through setting up the RideFlow backend with a MySQL database.

## Prerequisites

- Node.js (v14+) installed
- MySQL Server installed and running locally
- npm package manager

## Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs all required packages:
- `express` - Web framework
- `mysql2` - MySQL driver
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `dotenv` - Environment variables
- `express-validator` - Input validation

### Step 2: Configure Database Connection

The `.env` file is already created with default settings:

```
PORT=4000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rideflow
JWT_SECRET=rideflow_jwt_secret_key_change_in_production_12345
JWT_EXPIRY=24h
BCRYPT_ROUNDS=10
```

**If your MySQL requires a password**, update `.env`:
```
DB_PASSWORD=your_mysql_password
```

### Step 3: Initialize Database

Run the setup script to create the database schema and seed demo data:

```bash
node setup-db.js
```

This will:
1. Create the `rideflow` database
2. Create all 12 tables
3. Add triggers and stored procedures
4. Create demo users for testing

**Demo Credentials:**
- Admin:  `admin@rideflow.com` / `Admin@123`
- Rider:  `rider@rideflow.com` / `Rider@123`
- Driver: `driver@rideflow.com` / `Driver@123`

### Step 4: Start the Backend

```bash
npm run dev
```

Or for production:
```bash
npm start
```

The backend will start on `http://localhost:4000`

You should see:
```
RideFlow backend is running in development mode on port 4000
```

## API Endpoints

### Health Check

```
GET /health
GET /api/health
```

### Authentication

**Register New User**
```
POST /api/auth/register
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+923001234567",
  "password": "SecurePassword123",
  "role": "Rider"  // or "Driver"
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 4,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "Rider",
      "account_status": "Active"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Login**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "rider@rideflow.com",
  "password": "Rider@123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 2,
      "full_name": "Hassan Rider",
      "email": "rider@rideflow.com",
      "role": "Rider",
      "account_status": "Active"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Get Profile (Requires Token)**
```
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Response:
{
  "success": true,
  "message": "Profile retrieved",
  "data": {
    "id": 2,
    "full_name": "Hassan Rider",
    "email": "rider@rideflow.com",
    "phone_number": "03009876543",
    "role": "Rider",
    "account_status": "Active",
    "profile_photo": null,
    "registration_date": "2025-02-01T08:15:00.000Z",
    "created_at": "2025-03-08T10:30:00.000Z",
    "updated_at": "2025-03-08T10:30:00.000Z"
  }
}
```

## Testing with cURL

### Test Health Check
```bash
curl http://localhost:4000/api/health
```

### Test Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rider@rideflow.com",
    "password": "Rider@123"
  }'
```

### Test Protected Route
```bash
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Structure

### Main Tables

1. **users** - All users (Admin, Rider, Driver)
2. **drivers** - Driver profile information
3. **vehicles** - Driver vehicles
4. **locations** - Geographic locations
5. **rides** - Ride requests and lifecycle
6. **payments** - Payment records
7. **ratings** - User ratings
8. **complaints** - User complaints
9. **promo_codes** - Discount codes
10. **fare_rules** - Pricing rules
11. **driver_earnings** - Earnings tracking
12. **ride_history** - Archived rides

### Triggers

- `update_driver_average_rating` - Updates driver rating on new rating
- `archive_completed_ride` - Archives ride to ride_history on completion

### Stored Procedures

- `calculate_fare()` - Calculate fare with surge pricing
- `get_available_drivers()` - Find nearby drivers
- `process_driver_payout()` - Process earnings payout

## Project Structure

```
backend/
├── .env                    # Configuration
├── server.js              # Server entry point
├── app.js                 # Express app
├── setup-db.js            # Database initialization
├── package.json
├── config/
│   ├── db.js             # MySQL pool
│   ├── env.js            # Environment loader
│   └── constants.js      # App constants
├── controllers/
│   └── authController.js # Authentication logic
├── models/
│   └── userModel.js      # User database access
├── routes/
│   ├── api.js           # Main router
│   └── authRoutes.js    # Auth endpoints
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── errorHandler.js
│   └── validateRequest.js
├── utils/
│   ├── jwt.js           # JWT utilities
│   ├── passwordHash.js  # Password hashing
│   └── apiResponse.js   # Response formatting
└── database/
    └── schema.sql       # Database schema
```

## Next Steps

### Complete Backend Modules (Planned)

1. **User Management** - Get/update user profiles
2. **Driver Management** - Driver profile, verification, availability
3. **Vehicle Management** - Register, verify vehicles
4. **Ride Management** - Request, accept, complete, cancel rides
5. **Payment Management** - Payment records, refunds
6. **Rating System** - Submit and view ratings
7. **Complaints** - File and manage complaints
8. **Admin Reports** - Dashboard statistics and reports

### Frontend Integration

Once backend modules are complete:

1. Update `frontend/js/utils/api.js`:
   - Change `useMockData = true` to `useMockData = false`
   - Update API endpoint calls to use real URLs

2. Update `.env` in frontend (or hardcode API_BASE_URL):
   ```javascript
   const API_BASE_URL = 'http://localhost:4000/api';
   ```

3. Test login flow end-to-end

## Troubleshooting

### "Cannot connect to MySQL"
- Check MySQL is running: `mysql --version`
- Verify host/port in `.env`
- Check user permissions

### "Database already exists"
- This is normal on second run
- The schema checks and skips existing objects
- To reset: Drop database manually with `DROP DATABASE rideflow;`

### "EACCES permission denied"
- Run with `sudo node setup-db.js` if needed

### Port already in use
- Change PORT in `.env` to different port
- Or kill process: `lsof -ti:4000 | xargs kill`

## Security Notes

⚠️ **For Production:**
- Change `JWT_SECRET` to a long random string
- Set `NODE_ENV=production`
- Use environment-specific `.env` files
- Enable HTTPS
- Add rate limiting
- Implement proper CORS
- Add request logging
- Use environment secrets manager

## Support

For issues or questions, refer to:
- Backend structure: See `BACKEND_BUILD_PLAN.md`
- Database schema: See `backend/database/schema.sql`
- API contract: See individual controller files
