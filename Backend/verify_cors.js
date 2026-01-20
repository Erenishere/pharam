const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = 3999;

// The exact CORS configuration from api/index.js
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Set-Cookie']
}));

app.get('/test', (req, res) => res.json({ success: true }));

const server = app.listen(PORT, () => {
    console.log(`Verification server running on port ${PORT}`);

    const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/test',
        method: 'GET',
        headers: {
            'Origin': 'https://c-users-dc-desktop-pharam.vercel.app'
        }
    };

    const req = http.request(options, (res) => {
        console.log('Status Code:', res.statusCode);
        console.log('Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
        console.log('Access-Control-Allow-Credentials:', res.headers['access-control-allow-credentials']);

        const success = res.headers['access-control-allow-origin'] === 'https://c-users-dc-desktop-pharam.vercel.app' &&
            res.headers['access-control-allow-credentials'] === 'true';

        console.log('CORS Verification:', success ? 'PASSED' : 'FAILED');

        server.close(() => {
            process.exit(success ? 0 : 1);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
        server.close(() => {
            process.exit(1);
        });
    });

    req.end();
});
