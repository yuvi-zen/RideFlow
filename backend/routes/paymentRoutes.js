const express = require('express');
const { param, body, query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/paymentController');

const router = express.Router();

// NOTE: All specific named routes MUST come BEFORE /:id wildcard

// GET /api/payments/earnings?driver_id=X
router.get('/earnings', authMiddleware, query('driver_id').isInt(), ctrl.getEarnings);

// GET /api/payments/driver-earnings?driver_id=X  (frontend alias)
router.get('/driver-earnings', authMiddleware, query('driver_id').isInt(), ctrl.getEarnings);

// GET /api/payments/wallet
router.get('/wallet', authMiddleware, ctrl.getWallet);

// GET /api/payments/promos
router.get('/promos', authMiddleware, ctrl.getPromos);

// POST /api/payments/apply-promo
router.post('/apply-promo', authMiddleware, body('code').isString(), ctrl.validatePromo);

// POST /api/payments/payout
router.post('/payout', authMiddleware, body('driver_id').isInt(), ctrl.requestPayout);

// POST /api/payments  (create payment)
router.post('/', authMiddleware, body('ride_id').isInt(), body('amount').isFloat(), body('payment_method').optional(), ctrl.createPayment);

// GET /api/payments  (list payments)
router.get('/', authMiddleware, query('status').optional(), query('limit').optional().isInt(), query('offset').optional().isInt(), ctrl.listPayments);

// PUT /api/payments/:id/mark-paid
router.put('/:id/mark-paid', authMiddleware, requireAdmin, param('id').isInt().toInt(), ctrl.markPaid);

// PUT /api/payments/:id/mark-failed
router.put('/:id/mark-failed', authMiddleware, requireAdmin, param('id').isInt().toInt(), ctrl.markFailed);

// PUT /api/payments/:id/apply-promo
router.put('/:id/apply-promo', authMiddleware, param('id').isInt().toInt(), body('promo_code_id').isInt(), body('discount_amount').isFloat(), ctrl.applyPromo);

// GET /api/payments/:id  (MUST be last — wildcard)
router.get('/:id', authMiddleware, param('id').isInt().toInt(), ctrl.getPayment);

module.exports = router;
