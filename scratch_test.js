const https = require('https');

async function testVercelAPI() {
    try {
        // 1. Login to get token
        const loginData = JSON.stringify({ email: 'admin@rideflow.com', password: 'Admin@123' });
        console.log('Logging in...');
        
        const loginOptions = {
            hostname: 'ride-flow-theta.vercel.app',
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': loginData.length
            }
        };

        const token = await new Promise((resolve, reject) => {
            const req = https.request(loginOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const parsed = JSON.parse(data);
                    console.log('Login Response:', parsed.message);
                    if (parsed.success) resolve(parsed.data.token);
                    else reject(parsed.message);
                });
            });
            req.write(loginData);
            req.end();
        });

        // 2. Test /api/users?role=Rider
        console.log('\nTesting /api/users?role=Rider...');
        const healthOptions = {
            hostname: 'ride-flow-theta.vercel.app',
            path: '/api/users?role=Rider&limit=100',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        await new Promise((resolve, reject) => {
            const req = https.request(healthOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log('Health Status Code:', res.statusCode);
                    console.log('Health Response:', data);
                    resolve();
                });
            });
            req.end();
        });

    } catch (e) {
        console.error('Error:', e);
    }
}

testVercelAPI();
