// routes/studentRoute.js
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/addStudentController');
const adminAuth = require('../middlewares/adminAuthMiddleware');
const { uploadStudent, handleUploadErrors } = require('../config/uploadPhoto');

// ========== STUDENT ROUTES (Admin Only) ==========

// Add new student with profile photo
router.post(
  '/',
  adminAuth,
  uploadStudent,
  handleUploadErrors,
  studentController.addStudent
);

// Get all students with pagination, search and class filter
router.get(
  '/',
  adminAuth,
  studentController.getStudents
);

// Get single student by ID
router.get(
  '/:id',
  adminAuth,
  studentController.getStudent
);

// Update student with profile photo
router.put(
  '/:id',
  adminAuth,
  uploadStudent,
  handleUploadErrors,
  studentController.updateStudent
);

// Delete student
router.delete(
  '/:id',
  adminAuth,
  studentController.deleteStudent
);

module.exports = router;