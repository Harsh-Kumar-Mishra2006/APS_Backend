// routes/authRoute.js - UPDATED WITH MIDDLEWARE
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware'); // Import middleware

// ========== PUBLIC ROUTES ==========
router.post('/check-email', authController.checkEmailRegistration);
router.post('/complete-registration', authController.completeUserRegistration);
router.post('/login', authController.login);
router.get('/verify', authController.verifyToken); // Keep public for frontend checks
router.post('/admin/signup', authController.adminSignup);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ========== PROTECTED ROUTES (require auth) ==========
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

// ========== DEBUG/TEST ROUTES ==========
router.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Auth API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;