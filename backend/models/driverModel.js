/**
 * Driver Model - Database operations for driver profiles
 */

const db = require('../utils/dbWrapper');

const tableName = 'drivers';

// ==================== CREATE ====================

/**
 * Create driver profile for existing user
 */
exports.createDriver = async (driverData) => {
  const {
    user_id,
    license_number,
    cnic,
    license_expiry,
    availability_status = 'Offline'
  } = driverData;

  const sql = `INSERT INTO ${tableName} 
               (user_id, license_number, cnic, license_expiry, availability_status) 
               VALUES (?, ?, ?, ?, ?)`;
  
  const insertId = await db.insert(sql, [user_id, license_number, cnic, license_expiry, availability_status]);

  return {
    id: insertId,
    user_id,
    license_number,
    availability_status,
    created_at: new Date()
  };
};

// ==================== READ ====================

/**
 * Find driver by ID with user details
 */
exports.findById = async (id) => {
  const sql = `SELECT d.id, d.user_id, d.license_number, d.license_expiry, d.cnic, 
               d.availability_status, d.average_rating,
               d.total_trips_completed as total_trips, d.created_at, d.updated_at,
               u.full_name, u.email, u.phone_number, u.profile_photo
        FROM ${tableName} d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

/**
 * Find driver by user ID
 */
exports.findByUserId = async (userId) => {
  const sql = `SELECT d.id, d.user_id, d.license_number, d.license_expiry, d.cnic, 
               d.availability_status, d.average_rating,
               d.total_trips_completed as total_trips, d.created_at, d.updated_at,
               u.full_name, u.email, u.phone_number
        FROM ${tableName} d
        JOIN users u ON d.user_id = u.id
        WHERE d.user_id = ?`;
  const rows = await db.query(sql, [userId]);
  return rows[0] || null;
};

/**
 * Get all drivers with pagination and filtering
 */
exports.getAll = async (filters = {}) => {
  const { status, verified = null, limit = 50, offset = 0 } = filters;
  let sql = `SELECT d.id, d.user_id, d.license_number, d.license_expiry, d.cnic,
               d.availability_status, d.average_rating,
               d.total_trips_completed as total_trips, d.created_at, d.verification_status,
               u.full_name, u.email, u.phone_number, u.account_status
               FROM ${tableName} d
               JOIN users u ON d.user_id = u.id
               WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND d.availability_status = ?`;
    params.push(status);
  }

  if (verified !== null) {
    sql += ` AND d.verification_status = ?`;
    params.push(verified ? 'Verified' : 'Pending');
  }

  sql += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await db.query(sql, params);
};

/**
 * Get driver count
 */
exports.getCount = async (filters = {}) => {
  const { status, verified = null } = filters;
  let sql = `SELECT COUNT(*) as count FROM ${tableName} d
               JOIN users u ON d.user_id = u.id
               WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND d.availability_status = ?`;
    params.push(status);
  }

  if (verified !== null) {
    sql += ` AND d.verification_status = ?`;
    params.push(verified ? 'Verified' : 'Pending');
  }

  const rows = await db.query(sql, params);
  return rows[0].count;
};

/**
 * Find available drivers near location
 */
exports.findAvailableNearby = async (latitude, longitude, radiusKm = 5) => {
  const sql = `SELECT d.id, d.user_id, d.license_number, d.average_rating,
                u.full_name, u.phone_number,
                v.license_plate, v.vehicle_type
         FROM ${tableName} d
         JOIN users u ON d.user_id = u.id
         LEFT JOIN vehicles v ON d.id = v.driver_id
         WHERE d.availability_status = 'Online'
         AND d.verification_status = 'Verified'
         AND ST_Distance_Sphere(
             POINT(d.current_location_lng, d.current_location_lat),
             POINT(?, ?)
         ) / 1000 <= ?
         ORDER BY ST_Distance_Sphere(
             POINT(d.current_location_lng, d.current_location_lat),
             POINT(?, ?)
         ) ASC
         LIMIT 10`;
  return await db.query(sql, [longitude, latitude, radiusKm, longitude, latitude]);
};

// ==================== UPDATE ====================

/**
 * Update driver profile
 */
exports.updateProfile = async (id, updates) => {
  const allowedFields = ['license_number', 'license_expiry', 'cnic'];
  const updateFields = [];
  const updateValues = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updateFields.push(`${key} = ?`);
      updateValues.push(value);
    }
  }

  if (updateFields.length === 0) {
    return await exports.findById(id);
  }

  updateValues.push(id);
  const sql = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
  
  await db.execute(sql, updateValues);
  return await exports.findById(id);
};

/**
 * Update driver availability
 */
exports.updateAvailability = async (id, status) => {
  if (!['Online', 'Offline', 'On Trip'].includes(status)) {
    throw new Error('Invalid availability status');
  }

  const sql = `UPDATE ${tableName} SET availability_status = ? WHERE id = ?`;
  await db.execute(sql, [status, id]);
  return await exports.findById(id);
};

/**
 * Update driver verification status
 */
exports.updateVerificationStatus = async (id, status) => {
  if (!['Pending', 'Verified', 'Rejected'].includes(status)) {
    throw new Error('Invalid verification status');
  }

  const sql = `UPDATE ${tableName} SET verification_status = ? WHERE id = ?`;
  await db.execute(sql, [status, id]);
  return await exports.findById(id);
};

/**
 * Update current location
 */
exports.updateLocation = async (id, latitude, longitude) => {
  const sql = `UPDATE ${tableName} SET current_location_lat = ?, current_location_lng = ? WHERE id = ?`;
  await db.execute(sql, [latitude, longitude, id]);
  return await exports.findById(id);
};

/**
 * Increment trip count and update rating
 */
exports.updateTripStats = async (id) => {
  const sql = `UPDATE ${tableName} SET total_trips_completed = total_trips_completed + 1 WHERE id = ?`;
  await db.execute(sql, [id]);
  return await exports.findById(id);
};

// ==================== DELETE ====================

/**
 * Delete driver profile
 */
exports.deleteDriver = async (id) => {
  const sql = `DELETE FROM ${tableName} WHERE id = ?`;
  const affectedRows = await db.execute(sql, [id]);
  return affectedRows > 0;
};

// ==================== STATISTICS ====================

/**
 * Get driver statistics
 */
exports.getStatistics = async (id) => {
  const driver = await exports.findById(id);
  if (!driver) return null;

  const tripsSql = `SELECT COUNT(*) as total_trips, 
              AVG(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) * 100 as completion_rate
       FROM rides WHERE driver_id = ?`;
  const tripsRows = await db.query(tripsSql, [id]);

  const earningsSql = `SELECT SUM(final_fare) as total_earnings, 
              AVG(final_fare) as avg_ride_amount
       FROM rides WHERE driver_id = ? AND payment_status = 'Paid' AND status = 'Completed'`;
  const earningsRows = await db.query(earningsSql, [id]);

  const ratingsSql = `SELECT AVG(score) as avg_rating, COUNT(*) as total_ratings
       FROM ratings WHERE rated_user_id = ? AND rated_by = 'Rider'`;
  const ratingsRows = await db.query(ratingsSql, [driver.user_id]);

  const trips = tripsRows[0];
  const earnings = earningsRows[0];
  const ratings = ratingsRows[0];

  return {
    total_trips: trips.total_trips || 0,
    completion_rate: Math.round(trips.completion_rate || 0),
    total_earnings: earnings.total_earnings || 0,
    avg_ride_amount: earnings.avg_ride_amount || 0,
    avg_rating: ratings.avg_rating || 0,
    total_ratings: ratings.total_ratings || 0
  };
};

module.exports = exports;
