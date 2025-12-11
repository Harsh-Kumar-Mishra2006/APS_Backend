// controllers/authController.js - CORRECTED VERSION
const User = require('../models/authModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ========== NEW FUNCTIONS FOR PRE-REGISTERED USERS ==========
const JWT_SECRET = process.env.JWT_SECRET || 'Harsh2006@';
const TOKEN_EXPIRY = '7d';
// Check if email is pre-registered by admin
const checkEmailRegistration = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if user exists in the system
    const user = await User.findOne({ 
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Email not registered by admin. Please contact administrator.'
      });
    }

    // For admin users, they can always register/login
    if (user.role === 'admin') {
      const hasPassword = user.password && user.password.length > 0;
      return res.json({
        success: true,
        data: {
          isRegistered: true,
          email: user.email,
          name: user.name,
          role: user.role,
          hasPassword: hasPassword,
          needsSetup: !hasPassword
        }
      });
    }

    // For non-admin users, check if added by admin
    if (!user.addedBy) {
      return res.status(403).json({
        success: false,
        error: 'Account not authorized by administrator.'
      });
    }

    // Check if user has a password
    const hasPassword = user.password && user.password.length > 0;

    res.json({
      success: true,
      data: {
        isRegistered: true,
        email: user.email,
        name: user.name,
        role: user.role,
        hasPassword: hasPassword,
        needsSetup: !hasPassword
      }
    });

  } catch (err) {
    console.error("Check email error:", err);
    res.status(500).json({
      success: false,
      error: "Server error while checking email"
    });
  }
};

// Complete registration for pre-registered users
const completeUserRegistration = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Find the user
    const user = await User.findOne({ 
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Email not found in our system'
      });
    }

    // Allow admin to register without addedBy check
    if (user.role !== 'admin' && !user.addedBy) {
      return res.status(403).json({
        success: false,
        error: 'This account cannot be registered. Please contact administrator.'
      });
    }

    // Check if user already has a password
    if (user.password && user.password.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Account already registered. Please login instead.',
        needsLogin: true
      });
    }

    // Set the password (will be hashed by pre-save hook)
    user.password = password;
    user.isActive = true;
    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role,
        username: user.username,
        name: user.name
      }, 
      JWT_SECRET, // Consistent
  { expiresIn: TOKEN_EXPIRY } // Consistent
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          phone: user.phone,
          studentId: user.studentId,
          parentOf: user.parentOf,
          teacherSubjects: user.teacherSubjects,
          classGrade: user.classGrade
        }
      },
      message: 'Account setup completed successfully!'
    });

  } catch (err) {
    console.error("Complete registration error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during registration: " + err.message
    });
  }
};

// ========== MODIFIED EXISTING FUNCTIONS ==========

// Modified login function - FIXED VERSION
const login = async (req, res) => {
  try {
   const { email, identifier, password } = req.body; // Accept both
    
    // Use identifier if provided, otherwise use email
    const loginEmail = identifier || email;
    
    if (!loginEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/Username and password are required'
      });
    }

        // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: loginEmail.toLowerCase().trim() },
        { username: loginEmail.toLowerCase().trim() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }


    // Check if user was added by admin (except admin users themselves)
    if (user.role !== 'admin' && !user.addedBy) {
      return res.status(403).json({
        success: false,
        error: 'Account not authorized. Please contact administrator.'
      });
    }

    // Check if user has set a password yet
    if (!user.password || user.password.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Please complete your account setup first',
        needsSetup: true,
        email: user.email
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount += 1;
    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        username: user.username,
        role: user.role,
        name: user.name
      }, 
       JWT_SECRET, // Consistent
  { expiresIn: TOKEN_EXPIRY } // Consistent
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          phone: user.phone,
          studentId: user.studentId,
          parentOf: user.parentOf,
          teacherSubjects: user.teacherSubjects,
          classGrade: user.classGrade
        }
      },
      message: `Welcome back, ${user.name}!`,
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during login"
    });
  }
};

// Admin signup
const adminSignup = async (req, res) => {
  try {
    const { name, email, username, phone, password } = req.body;

    // Validation
    if (!name || !email || !password || !username || !phone) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Email or username already registered' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const adminUser = await User.create({
      name,
      email, 
      username, 
      phone,
      password: hash,
      role: 'admin',
      isDemoAdmin: true,
      addedBy: null // Admins are not added by anyone
    });

    // Generate token
    const token = jwt.sign(
      { 
        userId: adminUser._id, 
        email: adminUser.email,
        role: adminUser.role,
        username: adminUser.username,
        name: adminUser.name
      }, 
       JWT_SECRET, // Consistent
  { expiresIn: TOKEN_EXPIRY } // Consistent
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          username: adminUser.username,
          phone: adminUser.phone,
          role: adminUser.role,
          isDemoAdmin: adminUser.isDemoAdmin
        }
      },
      message: 'Admin account created successfully!'
    });

  } catch (err) {
    console.error("Admin Signup Error:", err);
    res.status(400).json({
      success: false,
      error: "Failed to create admin account: " + err.message
    });
  }
};

// Verify token
// In authController.js - FIX verifyToken
// In authController.js - FIX verifyToken function
const verifyToken = async (req, res) => {
  try {
    console.log('🔐 VERIFY TOKEN CALLED');
    
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('🔐 No token provided');
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // FIX THIS LINE - Use JWT_SECRET constant
    const decoded = jwt.verify(token, JWT_SECRET); // Changed from 'Harsh2006@'
    console.log('🔐 Token decoded:', decoded);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.log('🔐 User not found for ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('🔐 User inactive:', user.email);
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    console.log('🔐 Token valid for user:', user.email);
    
    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error("🔐 VERIFY TOKEN ERROR:", err.name, '-', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Rest of functions remain the same...
// getProfile, updateProfile, changePassword, logout, forgotPassword, resetPassword


// Forgot password request
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      addedBy: { $exists: true } // Must be added by admin
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Email not found or not registered by administrator'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { 
        userId: user._id,
        type: 'password_reset'
      },
       JWT_SECRET, // Consistent
  { expiresIn: TOKEN_EXPIRY } // Consistent
    );

    // Save reset token to user (you might want to add these fields to your schema)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // TODO: Send email with reset link
    // For now, return token in development
    const resetLink = `${req.headers.origin || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email.',
      data: {
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      }
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during password reset"
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (err) {
    console.error("Reset password error:", err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }
    res.status(500).json({
      success: false,
      error: "Server error during password reset"
    });
  }
};

// ========== MODIFIED EXISTING FUNCTIONS ==========


// Keep existing functions as they are
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          phone: user.phone,
          studentId: user.studentId,
          parentOf: user.parentOf,
          teacherSubjects: user.teacherSubjects,
          classGrade: user.classGrade,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          phone: user.phone
        }
      },
      message: 'Profile updated successfully'
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to change password"
    });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
    
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({
      success: false,
      error: "Error during logout"
    });
  }
};

module.exports = {
  // New functions
  checkEmailRegistration,
  completeUserRegistration,
  forgotPassword,
  resetPassword,
  
  // Modified functions
  adminSignup,
  login,
  verifyToken,
  
  // Existing functions
  getProfile,
  updateProfile,
  changePassword,
  logout
};