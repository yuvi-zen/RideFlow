/**
 * Vehicle Model - Database operations for vehicles
 */

const db = require('../utils/dbWrapper');

const tableName = 'vehicles';

// ==================== CREATE ====================

/**
 * Create new vehicle record
 */
exports.createVehicle = async (vehicleData) => {
  const {
    driver_id,
    license_plate,
    vehicle_type,
    make,
    model,
    year,
    color,
    registration_number
  } = vehicleData;

  const sql = `INSERT INTO ${tableName} 
               (driver_id, license_plate, vehicle_type, make, model, year, color, registration_number)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const insertId = await db.insert(sql, [driver_id, license_plate, vehicle_type, make, model, year, color, registration_number]);

  return {
    id: insertId,
    driver_id,
    license_plate,
    vehicle_type,
    verification_status: 'Pending',
    created_at: new Date()
  };
};

// ==================== READ ====================

/**
 * Find vehicle by ID
 */
exports.findById = async (id) => {
  const sql = `SELECT id, driver_id, license_plate, vehicle_type, make, model, year, color,
               registration_number, verification_status, 
               created_at, updated_at
        FROM ${tableName}
        WHERE id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

/**
 * Find vehicle by license plate (unique)
 */
exports.findByLicensePlate = async (licensePlate) => {
  const sql = `SELECT id, driver_id, license_plate, vehicle_type, verification_status
        FROM ${tableName}
        WHERE license_plate = ?`;
  const rows = await db.query(sql, [licensePlate]);
  return rows[0] || null;
};

/**
 * Get all vehicles by driver
 */
exports.findByDriver = async (driverId, limit = 50, offset = 0) => {
  const sql = `SELECT id, driver_id, license_plate, vehicle_type, make, model, year, color,
               verification_status, created_at
        FROM ${tableName}
        WHERE driver_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`;
  return await db.query(sql, [driverId, limit, offset]);
};

/**
 * Get all vehicles with filtering (admin)
 */
exports.getAll = async (filters = {}) => {
  const { status, vehicle_type, limit = 50, offset = 0 } = filters;
  let sql = `SELECT id, driver_id, license_plate, vehicle_type, make, model,
               year, color, verification_status, created_at
               FROM ${tableName}
               WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND verification_status = ?`;
    params.push(status);
  }

  if (vehicle_type) {
    sql += ` AND vehicle_type = ?`;
    params.push(vehicle_type);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await db.query(sql, params);
};

/**
 * Get vehicle count
 */
exports.getCount = async (filters = {}) => {
  const { status, vehicle_type } = filters;
  let sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE 1=1`;
  const params = [];

  if (status) {
    sql += ` AND verification_status = ?`;
    params.push(status);
  }

  if (vehicle_type) {
    sql += ` AND vehicle_type = ?`;
    params.push(vehicle_type);
  }

  const rows = await db.query(sql, params);
  return rows[0].count || 0;
};

// ==================== UPDATE ====================

/**
 * Update vehicle details
 */
exports.updateVehicle = async (id, updates) => {
  const allowedFields = ['vehicle_type', 'make', 'model', 'year', 'color'];
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
 * Update vehicle verification status
 */
exports.updateVerificationStatus = async (id, status) => {
  const sql = `UPDATE ${tableName} SET verification_status = ? WHERE id = ?`;
  await db.execute(sql, [status, id]);
  return await exports.findById(id);
};

// ==================== DELETE ====================

/**
 * Delete vehicle
 */
exports.deleteVehicle = async (id) => {
  const sql = `DELETE FROM ${tableName} WHERE id = ?`;
  const affectedRows = await db.execute(sql, [id]);
  return affectedRows > 0;
};

module.exports = exports;
