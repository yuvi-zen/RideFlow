const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rideflow'
  },
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_12345!',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h'
};
