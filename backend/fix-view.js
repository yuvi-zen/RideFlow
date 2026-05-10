const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixView() {
    let connection;
    try {
        const config = process.env.MYSQL_URL || {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
        };

        connection = await mysql.createConnection({
            uri: typeof config === 'string' ? config : undefined,
            ...(typeof config === 'object' ? config : {}),
            ssl: { rejectUnauthorized: false }
        });
        console.log('✓ Connected to live DB');

        // Drop and recreate the view with full columns
        await connection.query(`
            CREATE OR REPLACE VIEW TopDriversView AS
            SELECT 
                d.id AS driver_id,
                u.full_name,
                COALESCE(d.average_rating, 0) AS average_rating,
                COALESCE(COUNT(DISTINCT r.id), 0) AS total_rides,
                COALESCE(SUM(CASE WHEN p.payment_status = 'Paid' THEN p.amount ELSE 0 END), 0) AS total_earnings
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            LEFT JOIN rides r ON r.driver_id = d.id AND r.status = 'Completed'
            LEFT JOIN payments p ON p.ride_id = r.id
            GROUP BY d.id, u.full_name, d.average_rating
            ORDER BY d.average_rating DESC
        `);
        console.log('✓ TopDriversView recreated with total_rides and total_earnings');

        // Verify the result
        const [rows] = await connection.query('SELECT * FROM TopDriversView LIMIT 5');
        console.log('\nSample data from new view:');
        rows.forEach(r => console.log(`  ${r.full_name}: ${r.total_rides} rides, PKR ${r.total_earnings} earnings`));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixView();
