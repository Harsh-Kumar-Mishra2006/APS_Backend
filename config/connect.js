// config/connect.js - ENHANCED VERSION
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔌 Attempting MongoDB connection...');
    console.log('Database:', process.env.MONGODB_URI ? 'URI is set' : 'URI is NOT set');
    console.log('Node Environment:', process.env.NODE_ENV || 'development');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ ERROR: MONGODB_URI environment variable is missing!');
      console.error('Add it to Render Environment Variables');
      process.exit(1);
    }
    
    // Show first part of URI (for debugging, not full for security)
    const uriStart = process.env.MONGODB_URI.substring(0, 30);
    console.log(`Connection string starts with: ${uriStart}...`);
    
    // Check if it's a valid MongoDB URI format
    if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      console.error('❌ ERROR: Invalid MongoDB URI format!');
      console.error('URI should start with mongodb:// or mongodb+srv://');
      process.exit(1);
    }
    
    console.log('⏳ Connecting to MongoDB...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Host: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`📊 Port: ${conn.connection.port || 'default'}`);
    console.log(`📊 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    return conn;
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    console.error('\n🔍 Possible issues:');
    console.error('1. MONGODB_URI not set in Render Environment Variables');
    console.error('2. MongoDB Atlas IP not whitelisted (add 0.0.0.0/0)');
    console.error('3. Wrong username/password in connection string');
    console.error('4. Database name incorrect');
    console.error('5. Network connectivity issues');
    
    // Log full error for debugging
    if (error.name === 'MongoNetworkError') {
      console.error('🌐 Network error - check your internet connection and firewall');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('🖥️ Server selection error - MongoDB server might be down or unreachable');
    } else if (error.name === 'MongooseServerSelectionError') {
      console.error('🔒 Authentication error - check username/password in connection string');
    }
    
    // Retry connection in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Will retry connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;