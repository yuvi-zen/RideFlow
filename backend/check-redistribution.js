const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
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

        console.log('--- Ride Counts ---');
        const [counts] = await connection.query(`
            SELECT u.full_name, u.role, COUNT(r.id) as ride_count, SUM(r.final_fare) as total_spent
            FROM users u
            LEFT JOIN rides r ON u.id = r.rider_id
            WHERE u.role = 'Rider'
            GROUP BY u.id, u.full_name, u.role
        `);
        console.table(counts);

        const [ridesWithoutRider] = await connection.query(`
            SELECT COUNT(*) as count FROM rides WHERE rider_id IS NULL OR rider_id NOT IN (SELECT id FROM users WHERE role = 'Rider')
        `);
        console.log('Rides with invalid/null rider_id:', ridesWithoutRider[0].count);

        const [driverRides] = await connection.query(`
            SELECT u.full_name as driver_name, COUNT(r.id) as ride_count, SUM(r.final_fare) as total_earned
            FROM users u
            JOIN drivers d ON u.id = d.user_id
            JOIN rides r ON d.id = r.driver_id
            GROUP BY u.id, u.full_name
        `);
        console.log('--- Driver Earnings ---');
        console.table(driverRides);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
