const express = require('express');
const { param, body, query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/complaintController');

const router = express.Router();

router.post('/', authMiddleware, body('ride_id').isInt(), body('complaint_category').isString(), body('description').isString().isLength({ min: 10 }), ctrl.createComplaint);
router.get('/:id', authMiddleware, param('id').isInt().toInt(), ctrl.getComplaint);
router.get('/', authMiddleware, query('status').optional(), query('limit').optional().isInt(), query('offset').optional().isInt(), ctrl.listComplaints);
router.put('/:id/status', authMiddleware, requireAdmin, param('id').isInt().toInt(), body('status').isIn(['Open', 'InProgress', 'Resolved', 'Closed']), body('resolution').optional().isString(), ctrl.updateStatus);
router.delete('/:id', authMiddleware, param('id').isInt().toInt(), ctrl.deleteComplaint);

module.exports = router;
