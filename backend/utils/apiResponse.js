/**
 * apiResponse.js - Standardized API response formatting
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @param {number} status - HTTP status code
 */
function successResponse(res, data, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} errors - Detailed errors (optional)
 */
function errorResponse(res, message = 'Error', status = 500, errors = null) {
  return res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString()
  });
}

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors
 */
function validationErrorResponse(res, errors) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array(),
    timestamp: new Date().toISOString()
  });
}

/**
 * Pagination response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @param {string} message - Response message
 */
function paginatedResponse(res, data, page, limit, total, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
  // Aliases for backward compatibility
  success: successResponse,
  error: errorResponse
};
