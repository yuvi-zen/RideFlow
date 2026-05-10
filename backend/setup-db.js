#!/usr/bin/env node

/**
 * setup-db.js - Database initialization script (Optimized for Railway/Vercel)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

const SCHEMA_PATH = path.join(__dirname, 'database', 'schema.sql');

async function setupDatabase() {
  let connection;
  
  try {
    console.log('\n=== RideFlow Database Setup (Railway/MySQL) ===\n');
    
    // Support both MYSQL_URL and individual params
    const connectionConfig = process.env.MYSQL_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rideflow',
    };

    console.log('Connecting to database...');
    
    connection = await mysql.createConnection({
      uri: typeof connectionConfig === 'string' ? connectionConfig : undefined,
      ...(typeof connectionConfig === 'object' ? connectionConfig : {}),
      multipleStatements: true,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('✓ Connected successfully\n');

    // Read schema file
    console.log('Reading schema file...');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    // Execute schema
    console.log('Creating tables, triggers, and procedures...');
    
    // Clean slate: Drop all existing tables to ensure a fresh start
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    const [tables] = await connection.query("SHOW TABLES");
    for (const row of tables) {
        const tableName = Object.values(row)[0];
        await connection.query(`DROP TABLE IF EXISTS ${tableName}`);
    }
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    
    // Run the schema
    await connection.query(schema);
    console.log('✓ Schema executed successfully\n');

    // Seed demo users
    console.log('Seeding demo users and initial data...');
    const bcrypt = require('bcryptjs');
    const ROUNDS = 10;
    
    const adminHash = await bcrypt.hash('Admin@123', ROUNDS);
    const riderHash = await bcrypt.hash('Rider@123', ROUNDS);
    const driverHash = await bcrypt.hash('Driver@123', ROUNDS);

    // Users
    await connection.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status) VALUES 
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?)`,
      [
        'Ahmed Admin', 'admin@rideflow.com', '03001234567', adminHash, 'Admin', 'Active',
        'Alexander Rider', 'rider@rideflow.com', '03009876543', riderHash, 'Rider', 'Active',
        'Aizen Driver', 'driver@rideflow.com', '03005555555', driverHash, 'Driver', 'Active'
      ]
    );

    // Get the driver user ID (Aizen is the 3rd one)
    const [userRows] = await connection.query("SELECT id FROM users WHERE email = 'driver@rideflow.com'");
    const userId = userRows[0].id;

    // Driver Profile
    const [driverResult] = await connection.query(
      `INSERT INTO drivers (user_id, license_number, cnic, availability_status, verification_status, current_location_lat, current_location_lng) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, 'ABC-12345', '42101-1234567-1', 'Online', 'Verified', 33.6844, 73.0479]
    );
    const driverId = driverResult.insertId;

    // Vehicle
    await connection.query(
      `INSERT INTO vehicles (driver_id, make, model, year, color, license_plate, vehicle_type, verification_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [driverId, 'Toyota', 'Corolla', 2022, 'White', 'ABC-001', 'Economy', 'Verified']
    );

    console.log('✓ Demo data seeded\n');
    console.log('=== Database Setup Complete ===\n');
    console.log('Test Credentials:');
    console.log('  Admin:  admin@rideflow.com / Admin@123');
    console.log('  Rider:  rider@rideflow.com / Rider@123');
    console.log('  Driver: driver@rideflow.com / Driver@123\n');

  } catch (error) {
    console.error('\n❌ Error during setup:');
    console.error(error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
