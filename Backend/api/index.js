require('dotenv').config();
const mongoose = require('mongoose');
const ServerConfig = require('../src/config/server');

let isConnected = false;
let connectionPromise = null;

const connectToDatabase = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (connectionPromise) {
        return connectionPromise;
    }
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    
    connectionPromise = (async () => {
        try {
            await mongoose.connect(mongoUri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            isConnected = true;
            console.log('Connected to MongoDB via Vercel');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            connectionPromise = null;
            throw error;
        }
    })();
    
    return connectionPromise;
};

const serverConfig = new ServerConfig();
const app = serverConfig.getApp();

// Pre-connect on cold start (non-blocking)
connectToDatabase().catch(err => console.error('Failed to pre-connect on startup:', err));

// Middleware to ensure database connection
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        console.error('Database connection error for request:', error);
        if (!res.headersSent) {
            return res.status(500).json({ 
                success: false,
                error: 'Database connection failed', 
                message: error.message 
            });
        }
    }
});

module.exports = app;
