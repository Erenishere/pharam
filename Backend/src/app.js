const ServerConfig = require('./config/server');

// Create and export the Express app for testing
const serverConfig = new ServerConfig();
const app = serverConfig.getApp();

module.exports = app;
