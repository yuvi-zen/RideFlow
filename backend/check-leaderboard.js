const https = require('https');

async function checkLeaderboard() {
    const options = {
        hostname: 'ride-flow-theta.vercel.app',
        path: '/api/reports/top-drivers',
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', JSON.parse(data));
        });
    });

    req.on('error', (error) => console.error(error));
    req.end();
}

checkLeaderboard();
