/**
 * userModel.js - User model with database operations
 */

const db = require('../utils/dbWrapper');

const tableName = 'users';

// ==================== CREATE ====================

/**
 * Create new user account
 */
exports.createUser = async (userData) => {
  const {
    full_name,
    email,
    phone_number,
    password_hash,
    role,
    profile_photo = null
  } = userData;

  const sql = `INSERT INTO ${tableName} 
               (full_name, email, phone_number, password_hash, role, profile_photo) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  
  const insertId = await db.insert(sql, [full_name, email, phone_number, password_hash, role, profile_photo]);

  return {
    id: insertId,
    full_name,
    email,
    phone_number,
    role,
    account_status: 'Active'
  };
};

// ==================== READ ====================

/**
 * Find user by ID
 */
exports.findById = async (id) => {
  const sql = `SELECT id, full_name, email, phone_number, role, account_status, 
               profile_photo, registration_date, created_at, updated_at
               FROM ${tableName} WHERE id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

/**
 * Find user by email
 */
exports.findByEmail = async (email) => {
  const sql = `SELECT id, full_name, email, phone_number, password_hash, role, 
               account_status, profile_photo, created_at
               FROM ${tableName} WHERE email = ? LIMIT 1`;
  const rows = await db.query(sql, [email]);
  return rows[0] || null;
};

/**
 * Get all users with optional role filter
 */
exports.getAll = async (role = null, limit = 50, offset = 0) => {
  let sql = `SELECT id, full_name, email, phone_number, role, account_status, 
               profile_photo, registration_date, created_at
               FROM ${tableName}`;
  const params = [];

  if (role) {
    sql += ` WHERE role = ?`;
    params.push(role);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await db.query(sql, params);
};

/**
 * Get user count with optional role filter
 */
exports.getCount = async (role = null) => {
  let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
  const params = [];

  if (role) {
    sql += ` WHERE role = ?`;
    params.push(role);
  }

  const rows = await db.query(sql, params);
  return rows[0].count || 0;
};

/**
 * Get all users with filters (status, search, etc)
 */
exports.getAllWithFilters = async (filters = {}) => {
  let sql = `SELECT id, full_name, email, phone_number, role, account_status, profile_photo, registration_date, created_at FROM ${tableName} WHERE 1=1`;
  const params = [];

  if (filters.role) { sql += ` AND role = ?`; params.push(filters.role); }
  if (filters.status) { sql += ` AND account_status = ?`; params.push(filters.status); }
  if (filters.search) { sql += ` AND (email LIKE ? OR phone_number LIKE ?)`; params.push(`%${filters.search}%`, `%${filters.search}%`); }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(filters.limit || 50, filters.offset || 0);

  return await db.query(sql, params);
};

/**
 * Get user count with filters
 */
exports.getCountWithFilters = async (filters = {}) => {
  let sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE 1=1`;
  const params = [];

  if (filters.role) { sql += ` AND role = ?`; params.push(filters.role); }
  if (filters.status) { sql += ` AND account_status = ?`; params.push(filters.status); }
  if (filters.search) { sql += ` AND (email LIKE ? OR phone_number LIKE ?)`; params.push(`%${filters.search}%`, `%${filters.search}%`); }

  const rows = await db.query(sql, params);
  return { count: rows[0].count || 0 };
};

/**
 * Check if email exists
 */
exports.emailExists = async (email) => {
  const sql = `SELECT id FROM ${tableName} WHERE email = ?`;
  const rows = await db.query(sql, [email]);
  return rows.length > 0;
};

// ==================== UPDATE ====================

/**
 * Update user profile
 */
exports.updateProfile = async (id, updates) => {
  const allowedFields = ['full_name', 'phone_number', 'profile_photo'];
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
 * Update account status
 */
exports.updateAccountStatus = async (id, status) => {
  const sql = `UPDATE ${tableName} SET account_status = ? WHERE id = ?`;
  await db.execute(sql, [status, id]);
  return await exports.findById(id);
};

// ==================== DELETE ====================

/**
 * Delete user
 */
exports.deleteUser = async (id) => {
  const sql = `DELETE FROM ${tableName} WHERE id = ?`;
  const affectedRows = await db.execute(sql, [id]);
  return affectedRows > 0;
};

// ==================== STATISTICS ====================

/**
 * Get user count by role
 */
exports.getUserStatistics = async () => {
  const sql = `SELECT role, COUNT(*) as count FROM ${tableName} GROUP BY role`;
  const rows = await db.query(sql);

  const stats = {
    total: 0,
    admin: 0,
    rider: 0,
    driver: 0
  };

  rows.forEach(row => {
    const role = row.role;
    const count = Number(row.count || 0);
    stats.total += count;
    if (role === 'Admin') stats.admin = count;
    if (role === 'Rider') stats.rider = count;
    if (role === 'Driver') stats.driver = count;
  });

  return stats;
};

module.exports = exports;
