/**
 * Complaint Model
 */

const db = require('../utils/dbWrapper');

exports.createComplaint = async (data) => {
  const { ride_id, complainant_id, complaint_category, description } = data;
  
  const sql = `INSERT INTO complaints (ride_id, filed_by, complaint_type, description, status) 
               VALUES (?, ?, ?, ?, 'Open')`;
  
  const insertId = await db.insert(sql, [ride_id, complainant_id, complaint_category, description]);
  return { id: insertId, ...data, status: 'Open' };
};

exports.findById = async (id) => {
  const sql = `SELECT c.*, u.full_name as complainant_name FROM complaints c 
               JOIN users u ON c.filed_by = u.id WHERE c.id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

exports.getComplaints = async (filters = {}) => {
  const { complainant_id, status, limit = 20, offset = 0 } = filters;
  let sql = `SELECT * FROM complaints WHERE 1=1`;
  const params = [];
  if (complainant_id) { sql += ` AND filed_by = ?`; params.push(complainant_id); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  
  sql += ` ORDER BY submitted_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  return await db.query(sql, params);
};

exports.updateStatus = async (id, status, resolution = null) => {
  let sql = `UPDATE complaints SET status = ?`;
  const params = [status];
  
  if (resolution) { 
    sql += `, resolution_notes = ?, resolved_at = NOW()`; 
    params.push(resolution); 
  }
  
  sql += ` WHERE id = ?`;
  params.push(id);
  
  await db.execute(sql, params);
  return await exports.findById(id);
};

exports.deleteComplaint = async (id) => {
  const sql = `DELETE FROM complaints WHERE id = ?`;
  const affected = await db.execute(sql, [id]);
  return affected > 0;
};

module.exports = exports;
