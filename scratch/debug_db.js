const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkRadahn() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rideflow',
        port: process.env.DB_PORT || 3306
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        
        // Find user by email
        const [users] = await connection.execute("SELECT id, full_name, role FROM users WHERE email = 'radahn@elden.com'");
        console.log('User Record:', users[0]);

        if (users[0]) {
            // Find driver record
            const [drivers] = await connection.execute("SELECT * FROM drivers WHERE user_id = ?", [users[0].id]);
            console.log('Driver Record:', drivers[0]);

            if (drivers[0]) {
                // Check rides
                const [rides] = await connection.execute("SELECT COUNT(*) as count FROM rides WHERE driver_id = ?", [drivers[0].id]);
                console.log('Total Rides:', rides[0].count);

                // Check payments
                const [payments] = await connection.execute(
                    "SELECT COUNT(*) as count FROM payments p JOIN rides r ON p.ride_id = r.id WHERE r.driver_id = ? AND p.payment_status = 'Paid'",
                    [drivers[0].id]
                );
                console.log('Paid Payments:', payments[0].count);
            }
        }
        
        // Check ALL drivers to see if anyone has earnings
        const [allEarnings] = await connection.execute(`
            SELECT d.id, u.full_name, SUM(p.amount) as total
            FROM drivers d
            JOIN users u ON d.user_id = u.id
            JOIN rides r ON r.driver_id = d.id
            JOIN payments p ON p.ride_id = r.id
            WHERE p.payment_status = 'Paid'
            GROUP BY d.id
        `);
        console.log('All Driver Earnings:', allEarnings);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkRadahn();
