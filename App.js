const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('./config/connect');
require('dotenv').config();
const path= require('path');

// Importing routes
const authRoutes = require('./routes/authRoute');
const teacherRoutes= require('./routes/addTeacherRoute');
const { handleUploadErrors } = require('./config/uploadPhoto');
const parentRoutes = require('./routes/addParentRoute');
const studentRoutes= require('./routes/addStudentRoute');
const studentPerformenceRoutes= require('./routes/studentPerformenceRoute');
const teacherPerformanceRoutes= require('./routes/teacherPerformanceRoute');
const admissionRoutes= require('./routes/admissionRoute');
const app = express();

// CORS configuration - UPDATED FOR DEPLOYMENT
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://aps-frontend-tebg.onrender.com',
  'https://*.onrender.com'  // Allow ALL Render domains
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow ALL origins for now (temporary fix)
    // Remove this line after testing
    return callback(null, true);
    
    // OR use strict checking:
    /*
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost')) {
      return callback(null, true);
    }
    
    console.log(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS not allowed for origin: ${origin}`));
    */
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
// app.options('/*', (req, res) => {
//   res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
//   res.sendStatus(200);
// });
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug routes for auth testing
app.get('/api/debug/auth-check', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mypassword');
    const Auth = require('./models/authModel');
    const user = await Auth.findById(decoded.userId);
    
    res.json({
      success: true,
      tokenInfo: decoded,
      user: user ? {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      } : null
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Debug route to check all users
app.get('/api/debug/all-users', async (req, res) => {
  try {
    const Auth = require('./models/authModel');
    const users = await Auth.find({}).select('-password');
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Achievement Public School API is running!',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        verifyToken: 'GET /api/auth/verify'
      },
      debug: {
        authCheck: 'GET /api/debug/auth-check',
        allUsers: 'GET /api/debug/all-users'
      },
      health: 'GET /api/health'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    database: 'Connected to MongoDB'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/parents',parentRoutes);
app.use('/api/students',studentRoutes);
app.use('/api/student-performance',studentPerformenceRoutes);
app.use('/api/teacher-performance',teacherPerformanceRoutes);
app.use('/api/admissions',admissionRoutes);

// Serve static files (if needed for profile pictures)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found: ' + req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
  console.log(`Achievement Public School Backend Active`);
});

module.exports = app;
