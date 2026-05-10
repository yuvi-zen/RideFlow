/**
 * Rating Model
 */

const db = require('../utils/dbWrapper');

exports.createRating = async (data) => {
  const { ride_id, rater_id, rater_role, ratee_id, rating, comment } = data;
  
  const sql = `INSERT INTO ratings (ride_id, rated_by, rated_user_id, score, comment) 
               VALUES (?, ?, ?, ?, ?)`;
  
  const insertId = await db.insert(sql, [ride_id, rater_role, ratee_id, rating, comment]);
  return { id: insertId, ...data };
};

exports.findById = async (id) => {
  const sql = `SELECT * FROM ratings WHERE id = ?`;
  const rows = await db.query(sql, [id]);
  return rows[0] || null;
};

exports.getRatings = async (rateeId, limit = 20, offset = 0) => {
  const sql = `SELECT r.*, u.full_name 
               FROM ratings r 
               JOIN users u ON r.rated_user_id = u.id 
               WHERE r.rated_user_id = ? 
               ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return await db.query(sql, [rateeId, limit, offset]);
};

exports.getAverageRating = async (rateeId) => {
  const sql = `SELECT AVG(score) as avg_rating, COUNT(*) as total_ratings FROM ratings WHERE rated_user_id = ?`;
  const rows = await db.query(sql, [rateeId]);
  return rows[0] || { avg_rating: 0, total_ratings: 0 };
};

exports.getLeaderboard = async (limit = 10) => {
  const sql = `SELECT u.id, u.full_name, AVG(r.score) as avg_rating, COUNT(r.id) as total_ratings
       FROM users u LEFT JOIN ratings r ON u.id = r.rated_user_id
       GROUP BY u.id ORDER BY avg_rating DESC LIMIT ?`;
  return await db.query(sql, [limit]);
};

exports.deleteRating = async (id) => {
  const sql = `DELETE FROM ratings WHERE id = ?`;
  const affected = await db.execute(sql, [id]);
  return affected > 0;
};

module.exports = exports;
