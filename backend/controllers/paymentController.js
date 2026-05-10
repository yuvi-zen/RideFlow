/**
 * Payment Controller
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/apiResponse');
const paymentModel = require('../models/paymentModel');
const rideModel = require('../models/rideModel');
const { USER_ROLES } = require('../config/constants');

async function createPayment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { ride_id, amount, payment_method } = req.body;
    const ride = await rideModel.findById(ride_id);
    if (!ride) return errorResponse(res, 'Ride not found', 404);

    const payment = await paymentModel.createPayment({ ride_id, driver_id: ride.driver_id, amount, payment_method });
    return successResponse(res, payment, 'Payment created', 201);
  } catch (error) {
    next(error);
  }
}

async function getPayment(req, res, next) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    return successResponse(res, payment, 'Payment retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const payments = await paymentModel.getPayments({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    return successResponse(res, payments, 'Payments retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function markPaid(req, res, next) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    const updated = await paymentModel.updateStatus(req.params.id, 'Paid');
    return successResponse(res, updated, 'Payment marked as paid', 200);
  } catch (error) {
    next(error);
  }
}

async function markFailed(req, res, next) {
  try {
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    const updated = await paymentModel.updateStatus(req.params.id, 'Failed');
    return successResponse(res, updated, 'Payment marked as failed', 200);
  } catch (error) {
    next(error);
  }
}

async function applyPromo(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { promo_code_id, discount_amount } = req.body;
    const payment = await paymentModel.findById(req.params.id);
    if (!payment) return errorResponse(res, 'Payment not found', 404);

    const updated = await paymentModel.applyPromoCode(req.params.id, promo_code_id, discount_amount);
    return successResponse(res, updated, 'Promo code applied', 200);
  } catch (error) {
    next(error);
  }
}

async function getEarnings(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { driver_id, start_date, end_date } = req.query;
    const earnings = await paymentModel.getEarnings(driver_id, start_date, end_date);
    return successResponse(res, earnings, 'Earnings retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getWallet(req, res, next) {
  try {
    const userId = req.user.id;
    const balance = await paymentModel.getWalletBalance(userId);
    return successResponse(res, { user_id: userId, balance: balance || 0 }, 'Wallet balance retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getPromos(req, res, next) {
  try {
    const promos = await paymentModel.getActivePromos();
    return successResponse(res, promos || [], 'Promos retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function validatePromo(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { code } = req.body;
    const promo = await paymentModel.findPromoByCode(code);
    if (!promo) return errorResponse(res, 'Invalid promo code', 400);
    return successResponse(res, promo, 'Promo code valid', 200);
  } catch (error) {
    next(error);
  }
}

async function requestPayout(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    const { driver_id } = req.body;
    const pending = await paymentModel.getPendingEarnings(driver_id);
    if (!pending || pending.length === 0) {
      return errorResponse(res, 'No pending payouts available', 400);
    }
    await paymentModel.markPayoutRequested(driver_id);
    return successResponse(res, pending, 'Payout requested', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPayment, getPayment, listPayments, markPaid, markFailed, applyPromo, getEarnings,
  getWallet, getPromos, validatePromo, requestPayout
};
