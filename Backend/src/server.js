require('dotenv').config();

const ServerConfig = require('./config/server');
const database = require('./config/database');

class Server {
  constructor() {
    this.serverConfig = new ServerConfig();
    this.app = this.serverConfig.getApp();
    this.port = process.env.PORT || 3000;
    this.server = null;
  }

  async start() {
    try {
      // Connect to database
      await database.connect();

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close(async () => {
          console.log('HTTP server closed');

          try {
            await database.disconnect();
            console.log('Database connection closed');
            process.exit(0);
          } catch (error) {
            console.error('Error during shutdown:', error.message);
            process.exit(1);
          }
        });
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(async () => {
          await database.disconnect();
          resolve();
        });
      });
    }
  }

  getApp() {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;
