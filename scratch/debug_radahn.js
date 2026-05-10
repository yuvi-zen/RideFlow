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

    const connection = await mysql.createConnection(config);
    try {
        const [drivers] = await connection.execute(
            "SELECT d.id, u.full_name, d.average_rating FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'radahn@elden.com'"
        );
        console.log('Driver Record:', drivers[0]);

        if (drivers[0]) {
            const [earnings] = await connection.execute(
                "SELECT SUM(p.amount * 0.85) as total, COUNT(r.id) as count FROM rides r JOIN payments p ON r.id = p.ride_id WHERE r.driver_id = ? AND r.status = 'Completed' AND p.payment_status = 'Paid'",
                [drivers[0].id]
            );
            console.log('Earnings Summary:', earnings[0]);

            const [rides] = await connection.execute(
                "SELECT id, status, final_fare FROM rides WHERE driver_id = ?",
                [drivers[0].id]
            );
            console.log('Rides:', rides);

            const [payments] = await connection.execute(
                "SELECT ride_id, amount, payment_status FROM payments WHERE ride_id IN (SELECT id FROM rides WHERE driver_id = ?)",
                [drivers[0].id]
            );
            console.log('Payments:', payments);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkRadahn();
