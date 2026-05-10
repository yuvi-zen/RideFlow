/**
 * constants.js - Application constants and configurations
 */

// User roles
const USER_ROLES = {
  ADMIN: 'Admin',
  RIDER: 'Rider',
  DRIVER: 'Driver'
};

// Account statuses
const ACCOUNT_STATUS = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  BANNED: 'Banned'
};

// Ride statuses
const RIDE_STATUS = {
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  DRIVER_EN_ROUTE: 'Driver En Route',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

// Payment methods
const PAYMENT_METHOD = {
  CASH: 'Cash',
  WALLET: 'Wallet',
  CARD: 'Card'
};

// Payment statuses
const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded'
};

// Driver availability statuses
const DRIVER_AVAILABILITY = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  ON_TRIP: 'On Trip'
};

// Verification statuses
const VERIFICATION_STATUS = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected'
};

// Vehicle types
const VEHICLE_TYPE = {
  ECONOMY: 'Economy',
  PREMIUM: 'Premium',
  BIKE: 'Bike'
};

// Rating range
const RATING = {
  MIN: 1,
  MAX: 5
};

// Payout statuses
const PAYOUT_STATUS = {
  PENDING: 'Pending',
  PROCESSED: 'Processed',
  CANCELLED: 'Cancelled'
};

// Complaint statuses
const COMPLAINT_STATUS = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed'
};

module.exports = {
  USER_ROLES,
  ACCOUNT_STATUS,
  RIDE_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  DRIVER_AVAILABILITY,
  VERIFICATION_STATUS,
  VEHICLE_TYPE,
  RATING,
  PAYOUT_STATUS,
  COMPLAINT_STATUS
};
