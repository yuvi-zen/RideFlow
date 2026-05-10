/**
 * dbWrapper.js - Database wrapper for MySQL
 */
const db = require('../config/db');

/**
 * Execute a query and return rows
 */
async function query(sql, params = []) {
  const [rows] = await db.pool.query(sql, params);
  return rows;
}

/**
 * Execute an insert and return the new ID
 */
async function insert(sql, params = []) {
  const [result] = await db.pool.query(sql, params);
  return result.insertId;
}

/**
 * Execute update/delete and return affected rows
 */
async function execute(sql, params = []) {
  const [result] = await db.pool.query(sql, params);
  return result.affectedRows;
}

/**
 * Execute multiple queries in a transaction
 * @param {Function} callback - Async function that takes connection and performs queries
 */
async function transaction(callback) {
  const conn = await db.pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  query,
  insert,
  execute,
  transaction
};
