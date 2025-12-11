// middlewares/roleAuthMiddleware.js - UPDATED
const jwt = require('jsonwebtoken');
const User = require('../models/authModel');

// IMPORTANT: Use EXACTLY the same JWT_SECRET as in authController
const JWT_SECRET = process.env.JWT_SECRET || 'Harsh2006@';

const roleAuth = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      console.log('🔍 ROLE AUTH - Route:', req.originalUrl);
      console.log('🔍 Allowed roles:', allowedRoles);
      
      let token;

      // Check headers first (frontend sends here), then cookies
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('🔍 Token from Authorization header');
      } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('🔍 Token from cookies');
      }

      console.log('🔍 Token found:', !!token);

      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({
          success: false,
          error: 'Access denied. No token provided.'
        });
      }

      // ✅ Use SAME JWT_SECRET as authController
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('🔍 Token decoded - User ID:', decoded.userId);
      
      // Find user
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        console.log('❌ User not found in database');
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('🔍 User found:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });

      // Check if user is active
      if (!user.isActive) {
        console.log('❌ User account is not active');
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      // SPECIAL CASE: Admin bypasses all checks
      if (user.role === 'admin') {
        console.log('✅ Admin access granted - bypasses all checks');
        req.user = user;
        return next();
      }

      // For non-admin users, check if they were added by admin
      if (!user.addedBy) {
        console.log('❌ Non-admin user not added by admin');
        return res.status(403).json({
          success: false,
          error: 'Account not authorized by administrator'
        });
      }

      // Check if user has completed registration (has password)
      if (!user.password || user.password.length === 0) {
        console.log('❌ User has not completed registration');
        return res.status(403).json({
          success: false,
          error: 'Please complete your account registration first'
        });
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(user.role)) {
        console.log('❌ Role not allowed. User role:', user.role, 'Allowed:', allowedRoles);
        return res.status(403).json({
          success: false,
          error: `Access denied. ${allowedRoles.join('/')} privileges required.`
        });
      }

      console.log('✅ Role auth successful for:', user.email);
      req.user = user;
      next();
    } catch (error) {
      console.error('❌ ROLE AUTH ERROR:', error.name, '-', error.message);
      
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
      
      res.status(500).json({
        success: false,
        error: 'Server error in authentication'
      });
    }
  };
};

module.exports = roleAuth;