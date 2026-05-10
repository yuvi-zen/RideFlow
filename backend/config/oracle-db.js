const oracledb = require('oracledb');
require('dotenv').config();

// Set global defaults
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

const dbConfig = {
  user: process.env.ORACLE_USER || 'system',
  password: process.env.ORACLE_PASSWORD || 'password',
  connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XEPDB1',
};

let pool;

async function initialize() {
  try {
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMax: 10,
      poolMin: 2,
      poolIncrement: 1,
    });
    console.log('✓ Oracle Connection Pool initialized');
  } catch (err) {
    console.error('❌ Oracle initialization error:', err);
    throw err;
  }
}

async function getConnection() {
  if (!pool) {
    await initialize();
  }
  return await pool.getConnection();
}

async function closePool() {
  if (pool) {
    await pool.close();
  }
}

module.exports = {
  initialize,
  getConnection,
  closePool,
  oracledb
};
