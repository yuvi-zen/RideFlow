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
      { name: 'Malenia', city: 'Islamabad' },
      { name: 'Radahn', city: 'Islamabad' },
      { name: 'Morgott', city: 'Islamabad' },
      { name: 'Maliketh', city: 'Islamabad' },
      { name: 'Godfrey', city: 'Lahore' },
      { name: 'Radagon', city: 'Lahore' },
      { name: 'Rennala', city: 'Lahore' },
      { name: 'Godrick', city: 'Karachi' },
      { name: 'Mohg', city: 'Karachi' },
      { name: 'Rykkard', city: 'Karachi' }
    ];
    
    const npcs = [
      { name: 'Ranni', city: 'Islamabad' },
      { name: 'Blaidd', city: 'Islamabad' },
      { name: 'Alexander', city: 'Islamabad' },
      { name: 'Melina', city: 'Islamabad' },
      { name: 'Varre', city: 'Lahore' },
      { name: 'Patches', city: 'Lahore' },
      { name: 'Gideon', city: 'Lahore' },
      { name: 'Fia', city: 'Karachi' },
      { name: 'Seluvis', city: 'Karachi' },
      { name: 'Goldmask', city: 'Karachi' }
    ];

    // Seed default test rider
    const riderTestHash = await bcrypt.hash('Rider@123', ROUNDS);
    await connection.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, city, account_status) 
       VALUES ('Rider Test', 'rider@rideflow.com', '03009876543', ?, 'Rider', 'Islamabad', 'Active')`,
      [riderTestHash]
    );

    // Seed default test driver
    const driverTestHash = await bcrypt.hash('Driver@123', ROUNDS);
    const [dtResult] = await connection.query(
      `INSERT INTO users (full_name, email, phone_number, password_hash, role, city, account_status) 
       VALUES ('Driver Test', 'driver@rideflow.com', '03005555555', ?, 'Driver', 'Islamabad', 'Active')`,
      [driverTestHash]
    );
    const dtUserId = dtResult.insertId;
    const [dtdResult] = await connection.query(
      `INSERT INTO drivers (user_id, license_number, cnic, availability_status, verification_status) 
       VALUES (?, 'LIC-DRIVERTEST', 'CNIC-DRIVERTEST', 'Online', 'Verified')`,
      [dtUserId]
    );
    await connection.query(
      `INSERT INTO vehicles (driver_id, make, model, year, color, license_plate, vehicle_type, verification_status) 
       VALUES (?, 'Toyota', 'Corolla', 2020, 'Silver', 'PLATE-DRIVERTEST', 'Economy', 'Verified')`,
      [dtdResult.insertId]
    );

    // Seed Drivers (Bosses)
    let bossCount = 0;
    for (const item of bosses) {
      bossCount++;
      const username = item.name.toLowerCase().replace(' ', '');
      const email = `${username}@elden.com`;
      const password = `${username}123`;
      const hash = await bcrypt.hash(password, ROUNDS);
      
      const [uResult] = await connection.query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role, city, account_status) 
         VALUES (?, ?, ?, ?, 'Driver', ?, 'Active')`,
        [item.name, email, '03' + Math.floor(100000000 + Math.random() * 900000000), hash, item.city]
      );
      const userId = uResult.insertId;

      const [drResult] = await connection.query(
        `INSERT INTO drivers (user_id, license_number, cnic, availability_status, verification_status) 
         VALUES (?, ?, ?, 'Online', 'Verified')`,
        [userId, 'LIC-' + username.toUpperCase(), 'CNIC-' + userId]
      );
      const drId = drResult.insertId;

      let vMake, vModel, vColor, vType;
      if (bossCount <= 4) {
        vMake = 'Honda'; vModel = 'City'; vColor = 'White'; vType = 'Economy';
      } else if (bossCount <= 7) {
        vMake = 'Yamaha'; vModel = 'YBR 125'; vColor = 'Black'; vType = 'Bike';
      } else {
        vMake = 'Audi'; vModel = 'A6'; vColor = 'Black'; vType = 'Premium';
      }

      await connection.query(
        `INSERT INTO vehicles (driver_id, make, model, year, color, license_plate, vehicle_type, verification_status) 
         VALUES (?, ?, ?, 2024, ?, ?, ?, 'Verified')`,
        [drId, vMake, vModel, vColor, 'PLATE-' + username.toUpperCase(), vType]
      );
    }

    // Seed Locations for rides
    console.log('Seeding locations...');
    await connection.query(
      `INSERT INTO locations (address, city, latitude, longitude) VALUES 
      ('Safa Gold Mall', 'Islamabad', 33.7167, 73.0500),
      ('Centaurus Mall', 'Islamabad', 33.7077, 73.0503),
      ('Faisal Mosque', 'Islamabad', 33.7297, 73.0372),
      ('Giga Mall', 'Islamabad', 33.5262, 73.1517),
      ('Daman-e-Koh', 'Islamabad', 33.7431, 73.0645),
      ('Emporium Mall', 'Lahore', 31.4676, 74.2662),
      ('Minar-e-Pakistan', 'Lahore', 31.5925, 74.3095),
      ('Badshahi Mosque', 'Lahore', 31.5880, 74.3102),
      ('Lahore Fort', 'Lahore', 31.5878, 74.3142),
      ('Packages Mall', 'Lahore', 31.4691, 74.3734),
      ('Dolmen Mall Clifton', 'Karachi', 24.8138, 67.0311),
      ('Lucky One Mall', 'Karachi', 24.9204, 67.0932),
      ('Mazar-e-Quaid', 'Karachi', 24.8745, 67.0396),
      ('Clifton Beach', 'Karachi', 24.8000, 67.0300),
      ('Port Grand', 'Karachi', 24.8483, 66.9968)`
    );

    // Seed Riders (NPCs)
    for (const item of npcs) {
      const username = item.name.toLowerCase().replace(' ', '');
      const email = `${username}@elden.com`;
      const password = `${username}123`;
      const hash = await bcrypt.hash(password, ROUNDS);
      
      await connection.query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, role, city, account_status) 
         VALUES (?, ?, ?, ?, 'Rider', ?, 'Active')`,
        [item.name, email, '03' + Math.floor(100000000 + Math.random() * 900000000), hash, item.city]
      );
    }

    // Seed random ride history and ratings for analytics
    const [allRiders] = await connection.query("SELECT id, city FROM users WHERE role = 'Rider'");
    const [allDriverUsers] = await connection.query("SELECT id, full_name, city FROM users WHERE role = 'Driver'");
    const [allDriverProfiles] = await connection.query("SELECT id, user_id FROM drivers");
    const [allLocations] = await connection.query("SELECT id, city FROM locations");

    console.log('Generating random ride history and ratings...');
    for (let i = 0; i < 20; i++) {
      const rider = allRiders[Math.floor(Math.random() * allRiders.length)];
      const driversInCity = allDriverUsers.filter(u => u.city === rider.city);
      const locationsInCity = allLocations.filter(l => l.city === rider.city);

      if (driversInCity.length === 0 || locationsInCity.length < 2) continue;

      const driverUser = driversInCity[Math.floor(Math.random() * driversInCity.length)];
      const driverProfile = allDriverProfiles.find(p => p.user_id === driverUser.id);
      
      if (!driverProfile) continue;
      
      const pickupLoc = locationsInCity[Math.floor(Math.random() * locationsInCity.length)];
      let dropoffLoc = locationsInCity[Math.floor(Math.random() * locationsInCity.length)];
      while (dropoffLoc.id === pickupLoc.id) {
        dropoffLoc = locationsInCity[Math.floor(Math.random() * locationsInCity.length)];
      }
      
      const [rideResult] = await connection.query(
        `INSERT INTO rides (rider_id, driver_id, pickup_location_id, dropoff_location_id, status, final_fare, distance_km) 
         VALUES (?, ?, ?, ?, 'Completed', ?, ?)`,
        [rider.id, driverProfile.id, pickupLoc.id, dropoffLoc.id, Math.floor(Math.random() * 2000) + 500, (Math.random() * 20).toFixed(1)]
      );

      // Random ratings
      const score = Math.floor(Math.random() * 4) + 2;
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
