const ServerConfig = require('../src/config/server');
const database = require('../src/config/database');

// Create configuration
const serverConfig = new ServerConfig();
const app = serverConfig.getApp();

// Connect to database (Serverless function requires connection on each invocation or cached connection)
// In a serverless environment, we rely on Mongoose's internal connection buffering.
// However, ensuring connection is established is good practice.
database.connect()
    .then(() => console.log('Connected to MongoDB via Vercel'))
    .catch(err => console.error('MongoDB connection error:', err));

// Export the app for Vercel
module.exports = app;
