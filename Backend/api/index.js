require('dotenv').config();
const mongoose = require('mongoose');
const ServerConfig = require('../src/config/server');

let isConnected = false;

const connectToDatabase = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    
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
        throw error;
    }
};

const serverConfig = new ServerConfig();
const app = serverConfig.getApp();

app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', message: error.message });
    }
});

module.exports = app;
