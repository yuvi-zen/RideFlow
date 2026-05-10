const express = require('express');
const { param, body, query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/paymentController');

const router = express.Router();

router.post('/', authMiddleware, body('ride_id').isInt(), body('amount').isFloat(), body('payment_method').optional(), ctrl.createPayment);
router.get('/:id', authMiddleware, param('id').isInt().toInt(), ctrl.getPayment);
router.get('/', authMiddleware, query('status').optional(), query('limit').optional().isInt(), query('offset').optional().isInt(), ctrl.listPayments);
router.put('/:id/mark-paid', authMiddleware, requireAdmin, param('id').isInt().toInt(), ctrl.markPaid);
router.put('/:id/mark-failed', authMiddleware, requireAdmin, param('id').isInt().toInt(), ctrl.markFailed);
router.put('/:id/apply-promo', authMiddleware, param('id').isInt().toInt(), body('promo_code_id').isInt(), body('discount_amount').isFloat(), ctrl.applyPromo);
router.get('/earnings', authMiddleware, query('driver_id').isInt(), ctrl.getEarnings);
router.get('/driver-earnings', authMiddleware, query('driver_id').isInt(), ctrl.getEarnings);

// Frontend-compatible aliases
router.get('/wallet', authMiddleware, ctrl.getWallet);
router.get('/promos', authMiddleware, ctrl.getPromos);
router.post('/apply-promo', authMiddleware, body('code').isString(), ctrl.validatePromo);
router.post('/payout', authMiddleware, body('driver_id').isInt(), ctrl.requestPayout);

module.exports = router;
