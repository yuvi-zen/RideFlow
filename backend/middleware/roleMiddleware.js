/**
 * roleMiddleware.js - Role-based access control middleware
 */

const { errorResponse } = require('../utils/apiResponse');

/**
 * Verify user has required role
 * @param {...string} allowedRoles - Roles that can access this endpoint
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return errorResponse(res, 'User not authenticated', 401);
    }

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        403
      );
    }

    next();
  };
}

/**
 * Verify user is Admin
 */
const requireAdmin = roleMiddleware('Admin');

/**
 * Verify user is Rider
 */
const requireRider = roleMiddleware('Rider');

/**
 * Verify user is Driver
 */
const requireDriver = roleMiddleware('Driver');

/**
 * Verify user is Admin or specified user ID
 * Allows admin to access any user, but riders/drivers can only access themselves
 */
function requireAdminOrSelf(req, res, next) {
  if (!req.user) {
    return errorResponse(res, 'User not authenticated', 401);
  }

  const userId = parseInt(req.params.userId || req.params.id);
  
  if (req.user.role !== 'Admin' && req.user.id !== userId) {
    return errorResponse(res, 'Cannot access other users\' data', 403);
  }

  next();
}

module.exports = {
  roleMiddleware,
  requireAdmin,
  requireRider,
  requireDriver,
  requireAdminOrSelf
};
