const mysql = require('mysql2/promise');
require('dotenv').config();

async function redistributeRides() {
    let connection;
    try {
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

        console.log('Fetching riders...');
        const [riders] = await connection.query("SELECT id, full_name FROM users WHERE role = 'Rider'");
        if (riders.length === 0) {
            console.error('No riders found!');
            return;
        }

        console.log('Fetching all completed rides...');
        const [rides] = await connection.query("SELECT id, final_fare FROM rides WHERE status = 'Completed'");
        console.log(`Found ${rides.length} completed rides.`);

        console.log('Redistributing...');
        const riderIds = riders.map(r => r.id);
        
        for (let i = 0; i < rides.length; i++) {
            const ride = rides[i];
            const riderId = riderIds[i % riderIds.length];
            
            await connection.query("UPDATE rides SET rider_id = ? WHERE id = ?", [riderId, ride.id]);
            
            // Upsert payment
            await connection.query(`
                INSERT INTO payments (ride_id, rider_id, amount, payment_method, payment_status)
                VALUES (?, ?, ?, 'Cash', 'Paid')
                ON DUPLICATE KEY UPDATE rider_id = VALUES(rider_id), amount = VALUES(amount), payment_status = 'Paid'
            `, [ride.id, riderId, ride.final_fare]);

            if ((i + 1) % 10 === 0) {
                console.log(`Processed ${i + 1}/${rides.length} rides...`);
            }
        }

        console.log('✓ Redistribution complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

redistributeRides();
