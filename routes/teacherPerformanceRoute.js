// routes/teacherPerformanceRoutes.js
const express = require('express');
const router = express.Router();
const teacherPerformanceController = require('../controllers/teacherPerformanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleAuthMiddleware = require('../middlewares/roleAuthMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ========== TEACHER PERFORMANCE RECORDS ==========

// Create teacher performance record (Admin only)
router.post('/',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.createTeacherPerformance
);

// Get teacher performance by email (Admin, Teacher)
router.get('/:email',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getTeacherPerformance
);

// Get all teachers performance (Admin)
router.get('/',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.getAllTeachersPerformance
);

// Create performance record from existing teacher (Admin)
router.post('/create-from-teacher/:teacherId',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.createPerformanceFromTeacher
);

// Get teachers without performance records (Admin)
router.get('/teachers/without-performance',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.getTeachersWithoutPerformance
);

// ========== TEACHER INFORMATION ==========

// Update teacher basic info (Admin)
router.put('/:email/info',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.updateTeacherInfo
);

// ========== ATTENDANCE MANAGEMENT ==========

// Update monthly attendance (Admin)
router.put('/:email/attendance',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.updateMonthlyAttendance
);

// Get monthly attendance (Admin, Teacher)
router.get('/:email/attendance',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getMonthlyAttendance
);

// ========== PERFORMANCE REVIEWS ==========

// Add performance review (Admin)
router.post('/:email/review',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.addPerformanceReview
);

// Get performance reviews (Admin, Teacher)
router.get('/:email/reviews',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getPerformanceReviews
);

// ========== REMARKS & COMMENTS ==========

// Add teacher remark (Admin)
router.post('/:email/remark',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.addTeacherRemark
);

// Get teacher remarks (Admin, Teacher)
router.get('/:email/remarks',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getTeacherRemarks
);

// ========== SUBJECT ASSIGNMENT ==========

// Assign subject to teacher (Admin)
router.post('/:email/assign-subject',
  roleAuthMiddleware(['admin']),
  teacherPerformanceController.assignSubject
);

// Get teacher subject assignments (Admin, Teacher)
router.get('/:email/subject-assignments',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getSubjectAssignments
);

// ========== STATISTICS & ANALYTICS ==========

// Get teacher statistics (Admin, Teacher)
router.get('/:email/statistics',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getTeacherStatistics
);

// Get teacher dashboard data (Admin, Teacher)
router.get('/:email/dashboard',
  roleAuthMiddleware(['admin', 'teacher']),
  teacherPerformanceController.getTeacherDashboard
);

// ========== REMOVE THESE ROUTES (or implement the functions) ==========
// These routes reference functions that don't exist in your controller:

// REMOVE: Bulk update attendance (Admin) - function doesn't exist
// router.post('/bulk/attendance',
//   roleAuthMiddleware(['admin']),
//   teacherPerformanceController.bulkUpdateAttendance
// );

// REMOVE: Bulk add performance reviews (Admin) - function doesn't exist
// router.post('/bulk/reviews',
//   roleAuthMiddleware(['admin']),
//   teacherPerformanceController.bulkAddPerformanceReviews
// );

// REMOVE: Export teacher performance report (Admin) - function doesn't exist
// router.get('/:email/export',
//   roleAuthMiddleware(['admin']),
//   teacherPerformanceController.exportTeacherReport
// );

// REMOVE: Export all teachers performance (Admin) - function doesn't exist
// router.get('/export/all',
//   roleAuthMiddleware(['admin']),
//   teacherPerformanceController.exportAllTeachersPerformance
// );

module.exports = router;