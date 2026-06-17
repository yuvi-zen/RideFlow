const express = require('express');
const { query } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const db = require('../utils/dbWrapper');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

/**
 * GET /api/locations?city=Islamabad
 * Returns all locations for a given city (or all cities)
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { city } = req.query;
    let sql = 'SELECT id, address, city, latitude, longitude, type FROM locations';
    const params = [];
    if (city) {
      sql += ' WHERE city = ?';
      params.push(city);
    }
    sql += ' ORDER BY city, address';
    const rows = await db.query(sql, params);
    return successResponse(res, rows, 'Locations retrieved', 200);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
