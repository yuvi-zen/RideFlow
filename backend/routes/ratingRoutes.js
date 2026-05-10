const express = require('express');
const { param, body, query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/ratingController');

const router = express.Router();

// NOTE: Specific named routes MUST come before /:id wildcard

// POST /api/ratings
router.post('/', authMiddleware, body('ride_id').isInt(), body('ratee_id').isInt(), body('rating').isInt({ min: 1, max: 5 }), body('comment').optional().isString(), ctrl.submitRating);

// GET /api/ratings/leaderboard  — MUST be before /:id
router.get('/leaderboard', authMiddleware, query('limit').optional().isInt(), ctrl.getLeaderboard);

// GET /api/ratings/user/:rateeId  — MUST be before /:id
router.get('/user/:rateeId', authMiddleware, param('rateeId').isInt().toInt(), query('limit').optional().isInt(), query('offset').optional().isInt(), ctrl.getRatings);

// GET /api/ratings/summary/:rateeId  — MUST be before /:id
router.get('/summary/:rateeId', authMiddleware, param('rateeId').isInt().toInt(), ctrl.getSummary);

// GET /api/ratings/:id  — wildcard, must be last GET
router.get('/:id', authMiddleware, param('id').isInt().toInt(), ctrl.getRating);

// PUT /api/ratings/:id/flag
router.put('/:id/flag', authMiddleware, requireAdmin, param('id').isInt().toInt(), ctrl.flagRating);

// DELETE /api/ratings/:id
router.delete('/:id', authMiddleware, param('id').isInt().toInt(), ctrl.deleteRating);

module.exports = router;
