/**
 * Ride Model - Database operations for rides
 */

const db = require('../utils/dbWrapper');

const tableName = 'rides';

// ==================== CREATE ====================

/**
 * Create new ride request
 */
exports.createRide = async (rideData) => {
  const {
    rider_id,
    pickup_location_id,
    dropoff_location_id,
    scheduled_time = null,
    ride_type = 'Regular',
    estimated_distance = null,
    estimated_fare = null
  } = rideData;

  const sql = `INSERT INTO ${tableName} 
               (rider_id, pickup_location_id, dropoff_location_id, 
                distance_km, subtotal, status)
               VALUES (?, ?, ?, ?, ?, 'Requested')`;
  
  const insertId = await db.insert(sql, [rider_id, pickup_location_id, dropoff_location_id, 
                                       estimated_distance, estimated_fare]);

  return {
    id: insertId,
    rider_id,
    pickup_location_id,
    dropoff_location_id,
    status: 'Requested',
    created_at: new Date()
  };
};

// ==================== READ ====================

/**
 * Find ride by ID with full details
 */
exports.findById = async (id) => {
    const sql = `SELECT r.id, r.rider_id, r.driver_id, r.vehicle_id, r.status,
               r.pickup_location_id, r.dropoff_location_id,
               r.pickup_time, r.dropoff_time,
               r.distance_km, r.final_fare, r.subtotal,
               r.payment_status,
               r.created_at, r.updated_at,
               u.full_name as rider_name, u.phone_number as rider_phone,
               d.full_name as driver_name, d.phone_number as driver_phone,
               v.vehicle_type, v.license_plate
        FROM ${tableName} r
        LEFT JOIN users u ON r.rider_id = u.id
        LEFT JOIN drivers dr ON r.driver_id = dr.id
        LEFT JOIN users d ON dr.user_id = d.id
        LEFT JOIN vehicles v ON r.vehicle_id = v.id
        WHERE r.id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

/**
 * Get rides with advanced filtering
 */
exports.getRidesWithFilters = async (filters = {}) => {
  const { status, rider_id, driver_id, city, limit = 50, offset = 0 } = filters;
  let sql = `SELECT r.id, r.rider_id, r.driver_id, r.status,
               r.subtotal as estimated_fare, r.distance_km, r.final_fare, r.created_at,
               r.pickup_location_id, r.dropoff_location_id,
               u.full_name as rider_name, u.city as rider_city, d.full_name as driver_name
               FROM ${tableName} r
               LEFT JOIN users u ON r.rider_id = u.id
               LEFT JOIN drivers dr ON r.driver_id = dr.id
               LEFT JOIN users d ON dr.user_id = d.id
               WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND r.status = ?`;
    params.push(status);
  }
  if (rider_id) {
    sql += ` AND r.rider_id = ?`;
    params.push(rider_id);
  }
  if (driver_id) {
    sql += ` AND r.driver_id = ?`;
    params.push(driver_id);
  }
  if (city) {
    sql += ` AND u.city = ?`;
    params.push(city);
  }

  sql += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await db.query(sql, params);
};

/**
 * Get ride count with filters
 */
exports.getRideCount = async (filters = {}) => {
  const { status, rider_id, driver_id, city } = filters;
  let sql = `SELECT COUNT(*) as count 
             FROM ${tableName} r
             LEFT JOIN users u ON r.rider_id = u.id
             WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND r.status = ?`;
    params.push(status);
  }
  if (rider_id) {
    sql += ` AND r.rider_id = ?`;
    params.push(rider_id);
  }
  if (driver_id) {
    sql += ` AND r.driver_id = ?`;
    params.push(driver_id);
  }
  if (city) {
    sql += ` AND u.city = ?`;
    params.push(city);
  }

  const rows = await db.query(sql, params);
  return rows[0].count;
};

/**
 * Get rider's ride history
 */
exports.getRiderHistory = async (riderId, limit = 20, offset = 0) => {
  const sql = `SELECT r.id, r.status, r.subtotal, r.final_fare,
              r.pickup_time, r.dropoff_time, r.created_at,
              d.full_name as driver_name, v.vehicle_type, v.license_plate,
              rt.score as driver_rating
       FROM ${tableName} r
       LEFT JOIN drivers dr ON r.driver_id = dr.id
       LEFT JOIN users d ON dr.user_id = d.id
       LEFT JOIN vehicles v ON r.vehicle_id = v.id
       LEFT JOIN ratings rt ON rt.ride_id = r.id AND rt.rated_user_id = r.driver_id
       WHERE r.rider_id = ? AND r.status IN ('Completed', 'Cancelled')
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`;
  return await db.query(sql, [riderId, limit, offset]);
};

/**
 * Get driver's completed rides
 */
exports.getDriverHistory = async (driverId, limit = 20, offset = 0) => {
  const sql = `SELECT r.id, r.status, r.subtotal, r.final_fare,
              r.pickup_time, r.dropoff_time, r.created_at,
              u.full_name as rider_name,
              rt.score as rider_rating
       FROM ${tableName} r
       LEFT JOIN users u ON r.rider_id = u.id
       LEFT JOIN ratings rt ON rt.ride_id = r.id AND rt.rated_user_id = r.rider_id
       WHERE r.driver_id = ? AND r.status IN ('Completed', 'Cancelled')
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`;
  return await db.query(sql, [driverId, limit, offset]);
};

// ==================== UPDATE ====================

/**
 * Update ride status
 */
exports.updateStatus = async (rideId, newStatus) => {
  const validStatuses = ['Requested', 'Accepted', 'Driver En Route', 'In Progress', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid ride status');
  }

  let updateFields = ['status = ?'];
  const params = [newStatus];

  // Auto-update timestamps based on status
  if (newStatus === 'In Progress') {
    updateFields.push('pickup_time = NOW()');
  } else if (newStatus === 'Completed') {
    updateFields.push('dropoff_time = NOW()');
  }

  const sql = `UPDATE ${tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
  params.push(rideId);

  await db.execute(sql, params);
  return await exports.findById(rideId);
};

/**
 * Assign driver to ride
 */
exports.assignDriver = async (rideId, driverId, vehicleId) => {
  const sql = `UPDATE ${tableName} SET driver_id = ?, vehicle_id = ? WHERE id = ?`;
  await db.execute(sql, [driverId, vehicleId, rideId]);
  return await exports.findById(rideId);
};

/**
 * Update ride with final details
 */
exports.completRide = async (rideId, finalAmount, actualDistance) => {
  const sql = `UPDATE ${tableName} SET 
       status = 'Completed',
       dropoff_time = NOW(),
       final_fare = ?,
       distance_km = ?
       WHERE id = ?`;
  await db.execute(sql, [finalAmount, actualDistance, rideId]);
  return await exports.findById(rideId);
};

/**
 * Cancel ride
 */
exports.cancelRide = async (rideId, cancelReason = null) => {
  let sql = `UPDATE ${tableName} SET status = 'Cancelled'`;
  const params = [];

  if (cancelReason) {
    sql += `, cancellation_reason = ?`;
    params.push(cancelReason);
  }

  sql += ` WHERE id = ?`;
  params.push(rideId);

  await db.execute(sql, params);
  return await exports.findById(rideId);
};

// ==================== DELETE ====================

/**
 * Delete ride
 */
exports.deleteRide = async (id) => {
  const sql = `DELETE FROM ${tableName} WHERE id = ?`;
  const affectedRows = await db.execute(sql, [id]);
  return affectedRows > 0;
};

// ==================== STATISTICS ====================

/**
 * Get ride statistics for dashboard
 */
exports.getRideStats = async (filters = {}) => {
  const { start_date, end_date, rider_id, driver_id } = filters;
  
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (start_date) {
    whereClause += ` AND DATE(created_at) >= ?`;
    params.push(start_date);
  }
  if (end_date) {
    whereClause += ` AND DATE(created_at) <= ?`;
    params.push(end_date);
  }
  if (rider_id) {
    whereClause += ` AND rider_id = ?`;
    params.push(rider_id);
  }
  if (driver_id) {
    whereClause += ` AND driver_id = ?`;
    params.push(driver_id);
  }

  const sql = `SELECT 
        COUNT(*) as total_rides,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_rides,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_rides,
        SUM(CASE WHEN status IN ('Accepted', 'In Progress', 'Requested') THEN 1 ELSE 0 END) as active_rides,
        AVG(final_fare) as avg_ride_fare,
        SUM(final_fare) as total_revenue
       FROM ${tableName}
       ${whereClause}`;

  const rows = await db.query(sql, params);
  return rows[0];
};

module.exports = exports;
