const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/plagcheck';

let isMongoConnected = false;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    isMongoConnected = true;
    console.log('[MERN Database] MongoDB connected successfully.');
  } catch (err) {
    console.log('[MERN Database] MongoDB connection failed. Falling back to local filesystem JSON database.');
    isMongoConnected = false;
  }
};

const isConnected = () => isMongoConnected;

module.exports = { connectDB, isConnected };
