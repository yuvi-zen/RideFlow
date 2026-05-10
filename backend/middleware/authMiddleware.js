/**
 * authMiddleware.js - JWT token verification middleware
 */

const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Verify JWT token from request headers
 * Adds decoded user data to req.user
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return errorResponse(res, 'Authorization header missing', 401);
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    const status = error.message.includes('expired') ? 401 : 403;
    return errorResponse(res, error.message || 'Authentication failed', status);
  }
}

/**
 * Optional authentication - doesn't fail if no token, but decodes if present
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      const decoded = verifyToken(token);
      req.user = decoded;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware
};
