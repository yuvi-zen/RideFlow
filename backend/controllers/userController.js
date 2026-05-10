/**
 * User Controller - User management endpoints
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse, paginatedResponse } = require('../utils/apiResponse');
const userModel = require('../models/userModel');
const { USER_ROLES } = require('../config/constants');

async function getProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const userId = req.params.id;
    const user = await userModel.findById(userId);
    if (!user) return errorResponse(res, 'User not found', 404);

    if (req.user.role !== USER_ROLES.ADMIN && req.user.id !== parseInt(userId)) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    return successResponse(res, user, 'Profile retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { role, status, search, limit = 10, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const users = await userModel.getAllWithFilters({
      role, status, search, limit: limitNum, offset: offsetNum
    });

    const countResult = await userModel.getCountWithFilters({ role, status, search });

    return paginatedResponse(res, users, Math.floor(offsetNum / limitNum) + 1, limitNum, countResult.count, 'Users retrieved');
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const userId = req.params.id;
    if (req.user.role !== USER_ROLES.ADMIN && req.user.id !== parseInt(userId)) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    const { full_name, phone_number, profile_photo } = req.body;
    const updated = await userModel.updateProfile(userId, { full_name, phone_number, profile_photo });
    return successResponse(res, updated, 'Profile updated', 200);
  } catch (error) {
    next(error);
  }
}

async function updateAccountStatus(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { status } = req.body;
    const userId = req.params.id;
    const updated = await userModel.updateAccountStatus(userId, status);
    return successResponse(res, updated, `Account status updated to ${status}`, 200);
  } catch (error) {
    next(error);
  }
}

async function getUserStatistics(req, res, next) {
  try {
    const stats = await userModel.getUserStatistics();
    return successResponse(res, stats, 'Statistics retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const userId = req.params.id;
    await userModel.deleteUser(userId);
    return successResponse(res, null, 'User deleted', 200);
  } catch (error) {
    next(error);
  }
}

async function searchUsers(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { email, phone, limit = 10, offset = 0 } = req.query;
    const filters = { limit: parseInt(limit), offset: parseInt(offset) };
    if (email) filters.search = email;
    if (phone) filters.search = phone;

    const users = await userModel.getAllWithFilters(filters);
    return successResponse(res, users, 'Search results', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile, getAllUsers, updateProfile, updateAccountStatus,
  getUserStatistics, deleteUser, searchUsers
};
