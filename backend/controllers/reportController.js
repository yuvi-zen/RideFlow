/**
 * Admin Reports Controller - Analytics and Reporting
 */

const { validationResult } = require('express-validator');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/apiResponse');
const db = require('../config/db');

async function getRevenueByDate(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT DATE(created_at) as date, SUM(amount) as revenue, COUNT(*) as rides
       FROM payments WHERE status = 'Paid' AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at) ORDER BY date DESC`,
      [start_date, end_date]
    );
    conn.release();
    return successResponse(res, result, 'Revenue by date retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getRevenueByMethod(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT payment_method, SUM(amount) as revenue, COUNT(*) as transactions
       FROM payments WHERE status = 'Paid' GROUP BY payment_method`
    );
    conn.release();
    return successResponse(res, result, 'Revenue by method retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getRevenueByCity(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query('CALL get_revenue_by_city()');
    conn.release();
    // MySQL returns results in nested array for procedures: [ [results], {metadata} ]
    return successResponse(res, result[0], 'Revenue by city retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getDriverEarnings(req, res, next) {
  try {
    const { limit = 10 } = req.query;
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT u.id, u.full_name, d.average_rating, d.total_trips,
              SUM(p.amount) as total_earnings, AVG(p.amount) as avg_per_ride
       FROM drivers d JOIN users u ON d.user_id = u.id
       LEFT JOIN payments p ON d.id = p.driver_id AND p.status = 'Paid'
       GROUP BY d.id ORDER BY total_earnings DESC LIMIT ?`,
      [parseInt(limit)]
    );
    conn.release();
    return successResponse(res, result, 'Driver earnings retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getRideStats(req, res, next) {
  try {
    const { start_date, end_date } = req.query;
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT COUNT(*) as total_rides,
              SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
              ROUND(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as completion_rate,
              AVG(final_amount) as avg_fare FROM rides
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start_date, end_date]
    );
    conn.release();
    return successResponse(res, result[0], 'Ride stats retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getCancellationAnalysis(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT cancellation_reason, COUNT(*) as count, ROUND(COUNT(*) / 
       (SELECT COUNT(*) FROM rides WHERE status = 'Cancelled') * 100, 2) as percentage
       FROM rides WHERE status = 'Cancelled' AND cancellation_reason IS NOT NULL
       GROUP BY cancellation_reason ORDER BY count DESC`
    );
    conn.release();
    return successResponse(res, result, 'Cancellation analysis retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getComplaintsAnalysis(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query(
      `SELECT complaint_category, COUNT(*) as count, 
              SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
       FROM complaints GROUP BY complaint_category`
    );
    conn.release();
    return successResponse(res, result, 'Complaints analysis retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getTopDrivers(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query('SELECT * FROM TopDriversView LIMIT 10');
    conn.release();
    return successResponse(res, result, 'Top drivers retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getPlatformHealth(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [users] = await conn.query(`SELECT COUNT(*) as count FROM users`);
    const [drivers] = await conn.query(`SELECT COUNT(*) as count FROM drivers WHERE verification_status = 'Verified'`);
    const [activeRides] = await conn.query(`SELECT COUNT(*) as count FROM ActiveRidesView`);
    const [revenue] = await conn.query(`SELECT SUM(amount) as total FROM payments WHERE status = 'Paid'`);
    conn.release();

    return successResponse(res, {
      total_users: users[0].count,
      active_drivers: drivers[0].count,
      active_rides: activeRides[0].count,
      total_revenue: revenue[0].total || 0
    }, 'Platform health retrieved', 200);
  } catch (error) {
    next(error);
  }
}

async function getLowRatedDriversReport(req, res, next) {
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query('CALL get_low_rated_drivers()');
    conn.release();
    return successResponse(res, result[0], 'Low rated drivers report retrieved', 200);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRevenueByDate, getRevenueByMethod, getRevenueByCity, getDriverEarnings,
  getRideStats, getCancellationAnalysis, getComplaintsAnalysis, getTopDrivers,
  getPlatformHealth, getLowRatedDriversReport
};
