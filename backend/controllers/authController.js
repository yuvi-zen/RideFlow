/**
 * authController.js - Authentication endpoints (login, register, profile)
 */

const userModel = require('../models/userModel');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/apiResponse');
const { validationResult } = require('express-validator');

// ==================== REGISTER ====================

/**
 * POST /api/auth/register
 * Register new user account
 */
exports.register = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { full_name, email, phone_number, password, role } = req.body;

    // Check if email already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 409);
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const newUser = await userModel.createUser({
      full_name,
      email,
      phone_number,
      password_hash,
      role: role || 'Rider'
    });

    // Generate token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    return successResponse(res, {
      user: newUser,
      token
    }, 'Registration successful', 201);

  } catch (error) {
    next(error);
  }
};

// ==================== LOGIN ====================

/**
 * POST /api/auth/login
 * User login with email and password
 */
exports.login = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors);
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await userModel.findByEmail(email);
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Check account status
    if (user.account_status !== 'Active') {
      return errorResponse(
        res,
        `Account is ${user.account_status.toLowerCase()}. Please contact support.`,
        403
      );
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Return user data without password
    const { password_hash, ...userWithoutPassword } = user;

    return successResponse(res, {
      user: userWithoutPassword,
      token
    }, 'Login successful');

  } catch (error) {
    next(error);
  }
};

// ==================== PROFILE ====================

/**
 * GET /api/auth/profile
 * Get current authenticated user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'Profile retrieved');

  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, phone_number, profile_photo } = req.body;

    const updated = await userModel.updateProfile(userId, {
      full_name,
      phone_number,
      profile_photo
    });

    return successResponse(res, updated, 'Profile updated');

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 */
exports.logout = async (req, res, next) => {
  try {
    // Token invalidation is typically handled client-side
    return successResponse(res, { message: 'Logout successful' }, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return successResponse(res, { message: 'If email exists, reset link sent' }, 'Check your email');
    }

    // In production: Generate reset token, save to DB, send email
    // For now: Just return success

    return successResponse(res, { message: 'Password reset link sent to email' }, 'Check your email');

  } catch (error) {
    next(error);
  }
};

module.exports = exports;
