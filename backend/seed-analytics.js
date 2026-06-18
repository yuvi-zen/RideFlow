const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedAnalytics() {
    let connection;
    try {
        console.log('Connecting to database...');
        const config = process.env.MYSQL_URL || {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rideflow',
            port: process.env.DB_PORT || 54605,
        };

        connection = await mysql.createConnection({
            uri: typeof config === 'string' ? config : undefined,
            ...(typeof config === 'object' ? config : {}),
            ssl: { rejectUnauthorized: false }
        });
        console.log('✓ Connected');

        // 1. Update Vehicles (4 Bike, 3 Premium, 3 Economy)
        console.log('Updating vehicles types...');
        const [vehicles] = await connection.query('SELECT id FROM vehicles ORDER BY id ASC');
        
        for (let i = 0; i < vehicles.length; i++) {
            let type = 'Economy';
            let make = 'Toyota';
            let model = 'Corolla';
            let color = 'Silver';
            
            // Last 3 are Premium
            if (i >= vehicles.length - 3) {
                type = 'Premium';
                make = 'Audi';
                model = 'A6';
                color = 'Black';
            } 
            // Next 3 before that are Bike
            else if (i >= vehicles.length - 6) {
                type = 'Bike';
                make = 'Yamaha';
                model = 'YBR 125';
                color = 'Black';
            }
            // The rest (first ones) remain Economy (Toyota Corolla)
            
            await connection.query('UPDATE vehicles SET vehicle_type = ?, make = ?, model = ?, color = ? WHERE id = ?', [type, make, model, color, vehicles[i].id]);
        }
        console.log('✓ Vehicles updated');

        // 2. Generate 50 Completed Rides and Payments
        console.log('Generating 50 rides and payments...');
        const [riders] = await connection.query("SELECT id FROM users WHERE role = 'Rider'");
        const [drivers] = await connection.query("SELECT id FROM drivers");
        
        if (riders.length === 0 || drivers.length === 0) {
            throw new Error('No riders or drivers found to seed rides.');
        }

        const methods = ['Cash', 'Wallet', 'Card'];
        
        for (let i = 0; i < 50; i++) {
            const riderId = riders[Math.floor(Math.random() * riders.length)].id;
            const driverId = drivers[Math.floor(Math.random() * drivers.length)].id;
            const fare = Math.floor(Math.random() * 1500) + 300;
            const distance = (Math.random() * 15 + 2).toFixed(1);
            
            // Create Ride
            const [rideResult] = await connection.query(
                `INSERT INTO rides (rider_id, driver_id, pickup_location_id, dropoff_location_id, status, final_fare, distance_km, created_at) 
                 VALUES (?, ?, 1, 2, 'Completed', ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
                [riderId, driverId, fare, distance, Math.floor(Math.random() * 168)]
            );
            
            const rideId = rideResult.insertId;
            
            // Create Payment
            await connection.query(
                `INSERT INTO payments (ride_id, rider_id, amount, payment_method, payment_status, created_at) 
                 VALUES (?, ?, ?, ?, 'Paid', NOW())`,
                [rideId, riderId, fare, methods[Math.floor(Math.random() * methods.length)]]
            );
        }
        console.log('✓ 50 rides and payments seeded');

        // 3. Sync Driver Totals (total_trips and average_rating)
        console.log('Syncing driver summary columns...');
        await connection.query(`
            UPDATE drivers d 
            SET total_trips_completed = (SELECT COUNT(*) FROM rides r WHERE r.driver_id = d.id AND r.status = 'Completed'),
                average_rating = (
                    SELECT COALESCE(AVG(score), 0) 
                    FROM ratings rt 
                    JOIN rides r ON rt.ride_id = r.id 
                    WHERE r.driver_id = d.id
                )
        `);
        console.log('✓ Driver stats synced');
        console.log('=== Seeding Complete ===');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seedAnalytics();
