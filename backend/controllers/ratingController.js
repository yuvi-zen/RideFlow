/**
 * Rating Controller
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/apiResponse');
const ratingModel = require('../models/ratingModel');
const rideModel = require('../models/rideModel');

async function submitRating(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationErrorResponse(res, errors.array());

    let { ride_id, ratee_id, rating, comment } = req.body;
    const ride = await rideModel.findById(ride_id);
    if (!ride) return errorResponse(res, 'Ride not found', 404);

    const db = require('../utils/dbWrapper');
    if (!ratee_id) {
      if (req.user.role === 'Rider') {
        const [driverRow] = await db.pool.query('SELECT user_id FROM drivers WHERE id = ?', [ride.driver_id]);
        if (!driverRow || !driverRow[0]) {
          return errorResponse(res, 'Driver not assigned to this ride', 400);
        }
        ratee_id = driverRow[0].user_id;
      } else if (req.user.role === 'Driver') {
        ratee_id = ride.rider_id;
      } else {
        return errorResponse(res, 'Only riders and drivers can submit ratings', 403);
      }
    }

    const ratingRecord = await ratingModel.createRating({
      ride_id, rater_id: req.user.id, rater_role: req.user.role, ratee_id, rating, comment
    });
    return successResponse(res, ratingRecord, 'Rating submitted', 201);
  } catch (error) {
    next(error);
  }
}

async function getRating(req, res, next) {
  try {
    const rating = await ratingModel.findById(req.params.id);
    if (!rating) return errorResponse(res, 'Rating not found', 404);
    return successResponse(res, rating, 'Rating retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getRatings(req, res, next) {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const ratings = await ratingModel.getRatings(req.params.rateeId, parseInt(limit), parseInt(offset));
    return successResponse(res, ratings, 'Ratings retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await ratingModel.getAverageRating(req.params.rateeId);
    return successResponse(res, summary, 'Rating summary retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const leaderboard = await ratingModel.getLeaderboard(parseInt(limit));
    return successResponse(res, leaderboard, 'Leaderboard retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function flagRating(req, res, next) {
  try {
    const rating = await ratingModel.findById(req.params.id);
    if (!rating) return errorResponse(res, 'Rating not found', 404);
    const flagged = await ratingModel.flagRating(req.params.id);
    return successResponse(res, flagged, 'Rating flagged', 200);
  } catch (error) {
    next(error);
  }
}

async function deleteRating(req, res, next) {
  try {
    const rating = await ratingModel.findById(req.params.id);
    if (!rating) return errorResponse(res, 'Rating not found', 404);
    if (req.user.id !== rating.rater_id) return errorResponse(res, 'Can only delete own ratings', 403);
    await ratingModel.deleteRating(req.params.id);
    return successResponse(res, null, 'Rating deleted', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitRating, getRating, getRatings, getSummary, getLeaderboard, flagRating, deleteRating
};
