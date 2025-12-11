// routes/teacherRoute.js
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/addTeacherController');
const adminAuth = require('../middlewares/adminAuthMiddleware');
const { uploadTeacher, handleUploadErrors } = require('../config/uploadPhoto');

// ========== TEACHER ROUTES (Admin Only) ==========

// Add new teacher with profile photo
router.post(
  '/',
  adminAuth,
  uploadTeacher,
  handleUploadErrors,
  teacherController.addTeacher
);

// Get all teachers with pagination and search
router.get(
  '/',
  adminAuth,
  teacherController.getTeachers
);

// Get single teacher by ID
router.get(
  '/:id',
  adminAuth,
  teacherController.getTeacher
);

// Update teacher with profile photo
router.put(
  '/:id',
  adminAuth,
  uploadTeacher,
  handleUploadErrors,
  teacherController.updateTeacher
);

// Delete teacher
router.delete(
  '/:id',
  adminAuth,
  teacherController.deleteTeacher
);

module.exports = router;