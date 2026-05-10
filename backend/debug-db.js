const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugDB() {
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

        const [rows] = await connection.query('SELECT * FROM TopDriversView LIMIT 5');
        console.log('TopDriversView Rows:', rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

debugDB();
