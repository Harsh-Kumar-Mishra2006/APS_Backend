// config/connect.js
const mongoose = require('mongoose');
require('dotenv').config(); // Add this line

const connectDB = async () => {
  try {
    // Use the MONGODB_URI from .env instead of localhost
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connection successful");
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.log("MongoDB connection failed:", error.message);
    process.exit(1); // Exit process on failure
  }
};

module.exports = connectDB; // Export but don't call immediately