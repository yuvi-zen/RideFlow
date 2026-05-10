/**
 * Payment Model - Database operations for payments
 */

const db = require('../utils/dbWrapper');

exports.createPayment = async (paymentData) => {
  const { ride_id, rider_id, amount, payment_method = 'Cash' } = paymentData;
  const sql = `INSERT INTO payments (ride_id, rider_id, amount, payment_method, payment_status)
               VALUES (?, ?, ?, ?, 'Pending')`;
  
  const insertId = await db.insert(sql, [ride_id, rider_id, amount, payment_method]);
  return { id: insertId, ride_id, rider_id, amount, status: 'Pending' };
};

exports.findById = async (id) => {
  const sql = `SELECT p.*, r.status as ride_status, u.full_name as rider_name
               FROM payments p
               LEFT JOIN rides r ON p.ride_id = r.id
               LEFT JOIN users u ON p.rider_id = u.id
               WHERE p.id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

exports.getPayments = async (filters = {}) => {
  const { rider_id, status, limit = 50, offset = 0 } = filters;
  let sql = `SELECT * FROM payments WHERE 1=1`;
  const params = [];
  if (rider_id) { sql += ` AND rider_id = ?`; params.push(rider_id); }
  if (status) { sql += ` AND payment_status = ?`; params.push(status); }
  
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  return await db.query(sql, params);
};

exports.updateStatus = async (id, status, promoCodeId = null) => {
  let sql = `UPDATE payments SET payment_status = ?`;
  const params = [status];
  if (promoCodeId) { sql += `, promo_code_id = ?`; params.push(promoCodeId); }
  sql += ` WHERE id = ?`;
  params.push(id);
  
  await db.execute(sql, params);
  return await exports.findById(id);
};

exports.getEarnings = async (driverId, start, end) => {
  const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end || new Date().toISOString().split('T')[0];
  
  const sql = `SELECT SUM(net_earning) as total, AVG(net_earning) as avg_per_ride, COUNT(*) as ride_count
               FROM driver_earnings WHERE driver_id = ? AND payout_status = 'Pending'
               AND DATE(created_at) BETWEEN ? AND ?`;
  
  const rows = await db.query(sql, [driverId, startDate, endDate]);
  return rows[0] || { total: 0, avg_per_ride: 0, ride_count: 0 };
};

exports.getWalletBalance = async (userId) => {
  const sql = `SELECT COALESCE(SUM(CASE WHEN type IN ('TopUp', 'Refund', 'PromoCredit') THEN amount ELSE -amount END), 0) as balance
               FROM wallet_transactions WHERE rider_id = ?`;
  const rows = await db.query(sql, [userId]);
  return rows[0]?.balance || 0;
};

exports.getActivePromos = async () => {
  const sql = `SELECT id, code, discount_type, discount_value, max_discount, expiry_date
               FROM promo_codes WHERE is_active = TRUE AND expiry_date > CURDATE()
               AND (max_uses IS NULL OR used_count < max_uses)`;
  return await db.query(sql);
};

exports.findPromoByCode = async (code) => {
  const sql = `SELECT id, code, discount_type, discount_value, max_discount, expiry_date
               FROM promo_codes WHERE code = ? AND is_active = TRUE AND expiry_date > CURDATE()
               AND (max_uses IS NULL OR used_count < max_uses)`;
  const rows = await db.query(sql, [code]);
  return rows[0] || null;
};

module.exports = exports;
