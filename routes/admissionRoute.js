// routes/admissionRoute.js
const express = require('express');
const router = express.Router();
const {
  createAdmission,
  getAllAdmissions,
  getAdmissionById,
  updateAdmission,
  deleteAdmission,
  debugCreateAdmission  // Add this import
} = require('../controllers/admissionController');
const adminAuth = require('../middlewares/adminAuthMiddleware');

// Public routes - can view admissions
router.get('/', getAllAdmissions);  // Removed adminAuth for viewing
router.get('/:id', getAdmissionById);  // Removed adminAuth for viewing

// Debug route (temporary)
router.post('/debug', adminAuth, debugCreateAdmission);

// Admin only routes
router.post('/', adminAuth, createAdmission);
router.put('/:id', adminAuth, updateAdmission);
router.delete('/:id', adminAuth, deleteAdmission);

module.exports = router;