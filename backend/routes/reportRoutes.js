const express = require('express');
const { query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/reportController');

const router = express.Router();

router.get('/revenue/by-date', authMiddleware, requireAdmin, query('start_date').isISO8601(), query('end_date').isISO8601(), ctrl.getRevenueByDate);
router.get('/revenue/by-method', authMiddleware, requireAdmin, ctrl.getRevenueByMethod);
router.get('/revenue/by-city', authMiddleware, requireAdmin, ctrl.getRevenueByCity);
router.get('/driver-earnings', authMiddleware, requireAdmin, query('limit').optional().isInt(), ctrl.getDriverEarnings);
router.get('/ride-stats', authMiddleware, requireAdmin, query('start_date').isISO8601(), query('end_date').isISO8601(), ctrl.getRideStats);
router.get('/cancellations', authMiddleware, requireAdmin, ctrl.getCancellationAnalysis);
router.get('/complaints', authMiddleware, requireAdmin, ctrl.getComplaintsAnalysis);
router.get('/top-drivers', authMiddleware, requireAdmin, query('limit').optional().isInt(), ctrl.getTopDrivers);
router.get('/health', authMiddleware, requireAdmin, ctrl.getPlatformHealth);
router.get('/low-rated-drivers', authMiddleware, requireAdmin, ctrl.getLowRatedDriversReport);

module.exports = router;
