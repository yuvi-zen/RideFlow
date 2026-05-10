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

    // --- BULK SEEDING FOR RUBRIC COMPLIANCE ---
    console.log('Seeding diverse data for reports/views/triggers...');
    
    // Add more Riders
    await connection.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status) VALUES 
      ('Sajid Rider', 'sajid@test.com', '03110000001', ?, 'Rider', 'Active'),
      ('Fatima Rider', 'fatima@test.com', '03110000002', ?, 'Rider', 'Active'),
      ('John Doe', 'john@test.com', '03110000003', ?, 'Rider', 'Active')`,
      [riderHash, riderHash, riderHash]
    );

    // Add more Drivers
    await connection.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status) VALUES 
      ('Usman Driver', 'usman@test.com', '03220000001', ?, 'Driver', 'Active'),
      ('Ali Driver', 'ali@test.com', '03220000002', ?, 'Driver', 'Active'),
      ('Zain LowRated', 'zain@test.com', '03220000003', ?, 'Driver', 'Active')`,
      [driverHash, driverHash, driverHash]
    );

    // Register Drivers and Vehicles
    const [allDrivers] = await connection.query("SELECT id, full_name FROM users WHERE role = 'Driver'");
    for (const d of allDrivers) {
      const [drResult] = await connection.query(
        `INSERT INTO drivers (user_id, license_number, cnic, availability_status, verification_status, average_rating) 
         VALUES (?, ?, ?, 'Online', 'Verified', 0)`,
        [d.id, 'LIC-' + d.id, 'CNIC-' + d.id]
      );
      const drId = drResult.insertId;
      
      await connection.query(
        `INSERT INTO vehicles (driver_id, make, model, year, color, license_plate, vehicle_type, verification_status) 
         VALUES (?, 'Honda', 'Civic', 2021, 'Black', ?, 'Economy', 'Verified')`,
        [drId, 'PLATE-' + drId]
      );

    }

    // Seed some Locations
    await connection.query(
      `INSERT INTO locations (address, city, latitude, longitude) VALUES 
      ('Safa Gold Mall', 'Islamabad', 33.7167, 73.0500),
      ('Dolmen Mall', 'Karachi', 24.8138, 67.0311),
      ('Emporium Mall', 'Lahore', 31.4676, 74.2662)`
    );

    // Seed Completed Rides for Revenue Reports
    const [riders] = await connection.query("SELECT id FROM users WHERE role = 'Rider'");
    const [drProfiles] = await connection.query("SELECT id, user_id FROM drivers");
    
    await connection.query(
      `INSERT INTO rides (rider_id, driver_id, pickup_location_id, dropoff_location_id, status, final_fare, distance_km) VALUES 
      (?, ?, 1, 1, 'Completed', 1500, 15.5),
      (?, ?, 2, 2, 'Completed', 2800, 25.0),
      (?, ?, 3, 3, 'Completed', 900, 8.2),
      (?, ?, 1, 1, 'Completed', 2100, 18.0)`,
      [riders[0].id, drProfiles[0].id, riders[1].id, drProfiles[1].id, riders[2].id, drProfiles[0].id, riders[0].id, drProfiles[1].id]
    );

    // Get the ride IDs to link ratings
    const [rideRows] = await connection.query("SELECT id, driver_id FROM rides");
    
    // Add ratings linked to rides
    for (const r of rideRows) {
      const driver = drProfiles.find(dp => dp.id === r.driver_id);
      const [user] = await connection.query("SELECT full_name FROM users WHERE id = ?", [driver.user_id]);
      const score = user[0].full_name.includes('LowRated') ? 2 : 5;
      
      await connection.query(
        `INSERT INTO ratings (ride_id, rated_user_id, rated_by, score, comment) 
         VALUES (?, ?, 'Rider', ?, 'Auto-seeded rating')`,
        [r.id, driver.user_id, score]
      );
    }
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
