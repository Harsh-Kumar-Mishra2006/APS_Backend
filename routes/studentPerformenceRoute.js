// routes/studentPerformanceRoutes.js
const express = require('express');
const router = express.Router();
const studentPerformanceController = require('../controllers/studentPerformenceController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleAuthMiddleware = require('../middlewares/roleAuthMiddleware');
const { upload } = require('../config/uploadFiles');

// ========== PUBLIC TEST ROUTES (NO AUTH REQUIRED) ==========
router.get('/test', (req, res) => {
  console.log('🔍 Test route hit!');
  res.json({
    success: true,
    message: 'Student Performance API is working!',
    timestamp: new Date().toISOString()
  });
});

// ========== PROTECTED ROUTES (REQUIRE AUTHENTICATION) ==========
router.use(authMiddleware);

// ========== TEST ROUTE WITH AUTH ==========
router.get('/test-auth', (req, res) => {
  console.log('🔍 Test Auth - User:', req.user);
  res.json({
    success: true,
    user: req.user,
    message: 'Authentication is working!'
  });
});

// ========== CREATE STUDENT PERFORMANCE RECORD (ADMIN ONLY) ==========
router.post('/',
  roleAuthMiddleware(['admin']),
  studentPerformanceController.createStudentPerformance
);

// ========== GET STUDENT PERFORMANCE BY EMAIL ==========
router.get('/email/:email',
  roleAuthMiddleware(['admin', 'teacher', 'student', 'parent']),
  studentPerformanceController.getStudentPerformanceByEmail
);

// ========== GET STUDENT PERFORMANCE BY STUDENT ID ==========
router.get('/student/:studentId',
  roleAuthMiddleware(['admin', 'teacher', 'student', 'parent']),
  studentPerformanceController.getStudentPerformance
);

// ========== GET CLASS PERFORMANCE ==========
router.get('/class',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.getClassPerformance
);

// ========== ATTENDANCE ROUTES ==========
router.post('/:performanceId/attendance',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.markAttendance
);

router.put('/:performanceId/monthly-attendance',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.updateMonthlyAttendance
);

router.get('/:performanceId/monthly-attendance',
  roleAuthMiddleware(['admin', 'teacher', 'student', 'parent']),
  studentPerformanceController.getMonthlyAttendance
);

// ========== EXAM RESULT ROUTES ==========
router.post('/:performanceId/exam-result',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.addExamResult
);

router.get('/:performanceId/exam-results',
  roleAuthMiddleware(['admin', 'teacher', 'student', 'parent']),
  studentPerformanceController.getExamResultsByFilter
);

// ========== CLASS PERFORMANCE ROUTES ==========
router.post('/:performanceId/class-performance',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.addClassPerformance
);

// ========== TEACHER REMARK ROUTES ==========
router.post('/:performanceId/teacher-remark',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.addTeacherRemark
);

// ========== PERFORMANCE SCORES ROUTES ==========
router.put('/:performanceId/performance-scores',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.updatePerformanceScores
);

// ========== ATTENDANCE FILE ROUTES ==========
router.post('/:performanceId/upload-attendance',
  roleAuthMiddleware(['admin', 'teacher']),
  upload.single('attendanceFile'),
  studentPerformanceController.uploadAttendanceFile
);

router.delete('/:performanceId/attendance-file/:fileId',
  roleAuthMiddleware(['admin', 'teacher']),
  studentPerformanceController.deleteAttendanceFile
);

router.get('/:performanceId/download-attendance/:fileId',
  roleAuthMiddleware(['admin', 'teacher', 'student', 'parent']),
  studentPerformanceController.downloadAttendanceFile
);

// ========== STATISTICS ROUTE ==========
router.get('/:studentId/statistics',
  roleAuthMiddleware(['admin', 'teacher', 'student', 'parent']),
  studentPerformanceController.getPerformanceStatistics
);


// Add this to your routes temporarily
router.get('/debug/check-student/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = email.toLowerCase().trim();
    
    console.log('🔍 Debug check for email:', cleanEmail);
    
    // Check Student collection
    const student = await Student.findOne({ email: cleanEmail });
    
    // Check StudentPerformance collection
    const performance = await StudentPerformance.findOne({ studentEmail: cleanEmail });
    
    // Check User collection
    const user = await User.findOne({ email: cleanEmail });
    
    res.json({
      success: true,
      debug: {
        searchEmail: cleanEmail,
        studentExists: !!student,
        studentDetails: student ? {
          _id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          class: student.class,
          section: student.section
        } : 'NOT FOUND',
        performanceExists: !!performance,
        performanceDetails: performance ? {
          _id: performance._id,
          studentEmail: performance.studentEmail,
          studentName: performance.studentName
        } : 'NOT FOUND',
        userExists: !!user,
        userDetails: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        } : 'NOT FOUND'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
module.exports = router;