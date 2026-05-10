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

    // Add Admin user
    await connection.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status) 
       VALUES ('Ahmed Admin', 'admin@rideflow.com', '03001234567', ?, 'Admin', 'Active')`,
      [adminHash]
    );

    // --- ELDEN RING THEMED SEEDING ---
    console.log('Seeding 10 Boss Drivers and 10 NPC Riders (Elden Ring Theme)...');
    
    const bosses = [
      'Malenia', 'Radahn', 'Morgott', 'Maliketh', 'Godfrey', 
      'Radagon', 'Rennala', 'Godrick', 'Mohg', 'Rykkard'
    ];
    
    const npcs = [
      'Ranni', 'Blaidd', 'Alexander', 'Melina', 'Varre', 
      'Patches', 'Gideon', 'Fia', 'Seluvis', 'Goldmask'
    ];

    // Seed Drivers (Bosses)
    for (const name of bosses) {
      const username = name.toLowerCase().replace(' ', '');
      const email = `${username}@elden.com`;
      const password = `${username}123`;
      const hash = await bcrypt.hash(password, ROUNDS);
      
      const [uResult] = await connection.query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status) 
         VALUES (?, ?, ?, ?, 'Driver', 'Active')`,
        [name, email, '03' + Math.floor(100000000 + Math.random() * 900000000), hash]
      );
      const userId = uResult.insertId;

      const [drResult] = await connection.query(
        `INSERT INTO drivers (user_id, license_number, cnic, availability_status, verification_status) 
         VALUES (?, ?, ?, 'Online', 'Verified')`,
        [userId, 'LIC-' + username.toUpperCase(), 'CNIC-' + userId]
      );
      const drId = drResult.insertId;

      await connection.query(
        `INSERT INTO vehicles (driver_id, make, model, year, color, license_plate, vehicle_type, verification_status) 
         VALUES (?, 'Spectral', 'Steed', 2024, 'Gold', ?, 'Premium', 'Verified')`,
        [drId, 'PLATE-' + username.toUpperCase()]
      );
    }

    // Seed Locations for rides
    console.log('Seeding locations...');
    await connection.query(
      `INSERT INTO locations (address, city, latitude, longitude) VALUES 
      ('Safa Gold Mall', 'Islamabad', 33.7167, 73.0500),
      ('Dolmen Mall', 'Karachi', 24.8138, 67.0311),
      ('Emporium Mall', 'Lahore', 31.4676, 74.2662),
      ('Centaurus Mall', 'Islamabad', 33.7077, 73.0503),
      ('Lucky One Mall', 'Karachi', 24.9204, 67.0932)`
    );

    // Seed Riders (NPCs)
    for (const name of npcs) {
      const username = name.toLowerCase().replace(' ', '');
      const email = `${username}@elden.com`;
      const password = `${username}123`;
      const hash = await bcrypt.hash(password, ROUNDS);
      
      await connection.query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role, account_status) 
         VALUES (?, ?, ?, ?, 'Rider', 'Active')`,
        [name, email, '03' + Math.floor(100000000 + Math.random() * 900000000), hash]
      );
    }

    // Seed random ride history and ratings for analytics
    const [allRiders] = await connection.query("SELECT id FROM users WHERE role = 'Rider'");
    const [allDriverUsers] = await connection.query("SELECT id, full_name FROM users WHERE role = 'Driver'");
    const [allDriverProfiles] = await connection.query("SELECT id, user_id FROM drivers");

    console.log('Generating random ride history and ratings...');
    for (let i = 0; i < 20; i++) {
      const rider = allRiders[Math.floor(Math.random() * allRiders.length)];
      const driverProfile = allDriverProfiles[Math.floor(Math.random() * allDriverProfiles.length)];
      const driverUser = allDriverUsers.find(u => u.id === driverProfile.user_id);
      
      const [rideResult] = await connection.query(
        `INSERT INTO rides (rider_id, driver_id, pickup_location_id, dropoff_location_id, status, final_fare, distance_km) 
         VALUES (?, ?, 1, 2, 'Completed', ?, ?)`,
        [rider.id, driverProfile.id, Math.floor(Math.random() * 2000) + 500, (Math.random() * 20).toFixed(1)]
      );

      // Random ratings (High for favorites, low for others)
      const score = (driverUser.full_name === 'Malenia' || driverUser.full_name === 'Radahn') ? 5 : Math.floor(Math.random() * 4) + 2;
      await connection.query(
        `INSERT INTO ratings (ride_id, rated_user_id, rated_by, score, comment) 
         VALUES (?, ?, 'Rider', ?, 'Great journey through the Lands Between!')`,
        [rideResult.insertId, driverUser.id, score]
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
