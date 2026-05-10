const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

function getPool() {
  if (pool) return pool;

  const config = process.env.MYSQL_URL ? {
    uri: process.env.MYSQL_URL,
    ssl: { rejectUnauthorized: false }
  } : {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rideflow',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
  };

  pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return pool;
}

const getConnection = () => getPool().getConnection();

module.exports = {
  pool: getPool(),
  getConnection
};
