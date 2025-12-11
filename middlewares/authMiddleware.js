// middlewares/authMiddleware.js - UPDATED (uses same pattern as authController)
const jwt = require('jsonwebtoken');
const User = require('../models/authModel');

// IMPORTANT: Use EXACTLY the same JWT_SECRET as in authController
const JWT_SECRET = process.env.JWT_SECRET || 'Harsh2006@';

const auth = async (req, res, next) => {
  try {
    console.log('🔐 AUTH MIDDLEWARE - Route:', req.originalUrl);
    
    let token;

    // Check headers first (frontend sends here), then cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Token from Authorization header');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('🔐 Token from cookies');
    }

    console.log('🔐 Token found:', !!token);

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    // ✅ Use SAME JWT_SECRET as authController
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔐 Token decoded - User ID:', decoded.userId);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('🔐 User found:', user.email, 'Role:', user.role);

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ User account is not active');
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    console.log('✅ Auth successful for:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ AUTH ERROR:', error.name, '-', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = auth;