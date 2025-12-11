// routes/parentRoute.js
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/addParentController');
const adminAuth = require('../middlewares/adminAuthMiddleware');
const { uploadParent, handleUploadErrors } = require('../config/uploadPhoto');

// ========== PARENT ROUTES (Admin Only) ==========

// Add new parent with profile photo
router.post(
  '/',
  adminAuth,
  uploadParent,
  handleUploadErrors,
  parentController.addParent
);

router.get(
  '/search/students',
  adminAuth,
  parentController.searchStudents
);

// Get all parents with pagination and search
router.get(
  '/',
  adminAuth,
  parentController.getParents
);

// Get single parent by ID
router.get(
  '/:id',
  adminAuth,
  parentController.getParent
);

// Update parent with profile photo
router.put(
  '/:id',
  adminAuth,
  uploadParent,
  handleUploadErrors,
  parentController.updateParent
);

// Delete parent
router.delete(
  '/:id',
  adminAuth,
  parentController.deleteParent
);

module.exports = router;