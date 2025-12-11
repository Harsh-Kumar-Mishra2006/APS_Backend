// controllers/studentPerformanceController.js
const StudentPerformance = require('../models/studentPerformenceModel');
const Student = require('../models/addStudentModel');
const User = require('../models/authModel');
const path = require('path');
const fs = require('fs');

// ========== 1. CREATE STUDENT PERFORMANCE (WITH EMAIL VERIFICATION) ==========
exports.createStudentPerformance = async (req, res) => {
  try {
    const { studentId, studentEmail, academicYear, class: studentClass, section } = req.body;
    const userId = req.user._id;

    // Check if student exists and verify email
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Verify student email matches
    if (student.email !== studentEmail) {
      return res.status(400).json({
        success: false,
        error: 'Student email does not match'
      });
    }

    // Check if performance record already exists for this email
    const existingRecord = await StudentPerformance.findOne({ studentEmail });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: 'Performance record already exists for this student email'
      });
    }

    // Create new performance record
    const performanceRecord = await StudentPerformance.create({
      studentId,
      studentEmail,
      studentName: student.name,
      rollNumber: student.rollNumber,
      academicYear,
      class: studentClass,
      section,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Student performance record created successfully',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Create performance record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 2. GET STUDENT PERFORMANCE BY EMAIL ==========
// ========== 2. GET STUDENT PERFORMANCE BY EMAIL ==========
exports.getStudentPerformanceByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    console.log('🔍 Searching performance for email:', email);

    // 1. FIRST check if student exists
    const student = await Student.findOne({ email: email.toLowerCase().trim() });
    
    if (!student) {
      console.log('❌ Student not found in database:', email);
      return res.status(404).json({
        success: false,
        error: `Student with email "${email}" not found in database. Please add student first.`
      });
    }
    
    console.log('✅ Student found:', student.email, student.name);

    // 2. Try to find existing performance record
    let performanceRecord = await StudentPerformance.findOne({ 
      studentEmail: email.toLowerCase().trim() 
    })
      .populate('studentId', 'name rollNumber email class section dateOfBirth parents')
      .populate('attendance.markedBy', 'name role')
      .populate('examResults.uploadedBy', 'name role')
      .populate('classPerformance.evaluatedBy', 'name role')
      .populate('teacherRemarks.teacherId', 'name role subject')
      .populate('attendanceFiles.uploadedBy', 'name role')
      .populate('monthlyAttendance.updatedBy', 'name role')
      .populate('createdBy', 'name role')
      .populate('updatedBy', 'name role');

    // 3. If no performance record exists, CREATE ONE automatically
    if (!performanceRecord) {
      console.log('📝 No performance record found, creating one...');
      
      // Get current academic year
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const academicYear = currentMonth >= 6 ? 
        `${currentYear}-${currentYear + 1}` : 
        `${currentYear - 1}-${currentYear}`;

      // Create new performance record
      performanceRecord = await StudentPerformance.create({
        studentId: student._id,
        studentEmail: student.email.toLowerCase(),
        studentName: student.name,
        rollNumber: student.rollNumber,
        academicYear: academicYear,
        class: student.class || 'Not Assigned',
        section: student.section || 'A',
        attendance: [],
        monthlyAttendance: [],
        examResults: [],
        classPerformance: [],
        teacherRemarks: [],
        attendanceFiles: [],
        totalPresent: 0,
        totalAbsent: 0,
        attendancePercentage: 0,
        averageScore: 0,
        createdBy: req.user?._id || student.userId,
        isActive: true
      });

      console.log('✅ Performance record created:', performanceRecord._id);
    }

    res.json({
      success: true,
      data: performanceRecord,
      message: performanceRecord.isNew ? 'Performance record auto-created' : 'Performance record found'
    });
  } catch (error) {
    console.error('Get student performance by email error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching performance data: ' + error.message
    });
  }
};

// ========== 3. UPDATE MONTHLY ATTENDANCE ==========
exports.updateMonthlyAttendance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { month, year, workingDays, presentDays, remarks } = req.body;
    const userId = req.user._id;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
    }

    if (workingDays < presentDays) {
      return res.status(400).json({
        success: false,
        error: 'Present days cannot exceed working days'
      });
    }

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

    // Find or create monthly attendance record
    const monthlyAttendanceIndex = performanceRecord.monthlyAttendance.findIndex(
      ma => ma.month === month && ma.year === year
    );

    if (monthlyAttendanceIndex === -1) {
      // Create new monthly attendance record
      performanceRecord.monthlyAttendance.push({
        month,
        year,
        workingDays,
        presentDays,
        attendancePercentage,
        remarks,
        updatedBy: userId,
        lastUpdated: new Date()
      });
    } else {
      // Update existing monthly attendance record
      performanceRecord.monthlyAttendance[monthlyAttendanceIndex] = {
        ...performanceRecord.monthlyAttendance[monthlyAttendanceIndex].toObject(),
        workingDays,
        presentDays,
        attendancePercentage,
        remarks,
        updatedBy: userId,
        lastUpdated: new Date()
      };
    }

    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Monthly attendance updated successfully',
      data: performanceRecord.monthlyAttendance.find(
        ma => ma.month === month && ma.year === year
      )
    });
  } catch (error) {
    console.error('Update monthly attendance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 4. ADD EXAM RESULT WITH MULTIPLE SUBJECTS ==========
exports.addExamResult = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { 
      examType, 
      examMonth, 
      examYear, 
      subjects, 
      remarks, 
      conductedDate 
    } = req.body;
    const userId = req.user._id;

    // Validate subjects array
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one subject is required'
      });
    }

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    // Calculate subject-wise percentages and grades
    const processedSubjects = subjects.map(subject => {
      const percentage = (subject.obtainedMarks / subject.totalMarks) * 100;
      let grade = '';
      
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      else grade = 'F';

      return {
        ...subject,
        percentage,
        grade
      };
    });

    // Calculate overall percentage and grade
    const totalMarks = processedSubjects.reduce((sum, subject) => sum + subject.totalMarks, 0);
    const totalObtained = processedSubjects.reduce((sum, subject) => sum + subject.obtainedMarks, 0);
    const overallPercentage = (totalObtained / totalMarks) * 100;
    
    let overallGrade = '';
    if (overallPercentage >= 90) overallGrade = 'A+';
    else if (overallPercentage >= 80) overallGrade = 'A';
    else if (overallPercentage >= 70) overallGrade = 'B';
    else if (overallPercentage >= 60) overallGrade = 'C';
    else if (overallPercentage >= 50) overallGrade = 'D';
    else overallGrade = 'F';

    // Create exam result with multiple subjects
    performanceRecord.examResults.push({
      examType,
      examMonth,
      examYear,
      subjects: processedSubjects,
      overallPercentage,
      overallGrade,
      remarks,
      conductedDate: conductedDate || new Date(),
      uploadedBy: userId
    });

    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Exam result added successfully',
      data: {
        examType,
        examMonth,
        examYear,
        overallPercentage,
        overallGrade,
        subjectCount: processedSubjects.length
      }
    });
  } catch (error) {
    console.error('Add exam result error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 5. GET MONTHLY ATTENDANCE SUMMARY ==========
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { performanceId, month, year } = req.query;
    
    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    let monthlyAttendance;
    if (month && year) {
      // Get specific month attendance
      monthlyAttendance = performanceRecord.monthlyAttendance.find(
        ma => ma.month === month && ma.year === parseInt(year)
      );
      
      if (!monthlyAttendance) {
        return res.status(404).json({
          success: false,
          error: 'Monthly attendance not found for specified month and year'
        });
      }
    } else {
      // Get all monthly attendance
      monthlyAttendance = performanceRecord.monthlyAttendance;
    }

    res.json({
      success: true,
      data: monthlyAttendance
    });
  } catch (error) {
    console.error('Get monthly attendance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 6. GET EXAM RESULTS BY FILTER ==========
exports.getExamResultsByFilter = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { examType, month, year } = req.query;
    
    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    let filteredResults = performanceRecord.examResults;
    
    if (examType) {
      filteredResults = filteredResults.filter(exam => exam.examType === examType);
    }
    
    if (month) {
      filteredResults = filteredResults.filter(exam => exam.examMonth === month);
    }
    
    if (year) {
      filteredResults = filteredResults.filter(exam => exam.examYear === parseInt(year));
    }

    res.json({
      success: true,
      count: filteredResults.length,
      data: filteredResults
    });
  } catch (error) {
    console.error('Get exam results by filter error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 7. UPLOAD ATTENDANCE FILE WITH MONTH REFERENCE ==========
exports.uploadAttendanceFile = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { month, year, forMonth, description } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!month || !year || !forMonth) {
      return res.status(400).json({
        success: false,
        error: 'Month, year, and forMonth are required'
      });
    }

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    performanceRecord.attendanceFiles.push({
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: userId,
      month,
      year,
      forMonth,
      description
    });

    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Attendance file uploaded successfully',
      data: {
        fileName: req.file.originalname,
        month,
        year,
        forMonth,
        description
      }
    });
  } catch (error) {
    console.error('Upload attendance file error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 8. MARK ATTENDANCE ==========
exports.markAttendance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { date, status, reason } = req.body;
    const userId = req.user._id;

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    // Convert and normalize dates for comparison
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Check if attendance already marked for this date
    const existingAttendance = performanceRecord.attendance.find(a => {
      const recordDate = new Date(a.date);
      recordDate.setHours(0, 0, 0, 0); // Normalize to start of day
      return recordDate.getTime() === attendanceDate.getTime();
    });

    if (existingAttendance) {
      // Update existing attendance instead of preventing
      existingAttendance.status = status;
      existingAttendance.reason = reason || existingAttendance.reason;
      existingAttendance.markedBy = userId;
    } else {
      // Add new attendance record
      performanceRecord.attendance.push({
        date: attendanceDate,
        status,
        reason,
        markedBy: userId
      });
    }

    await performanceRecord.save();

    res.json({
      success: true,
      message: existingAttendance ? 'Attendance updated successfully' : 'Attendance marked successfully',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 9. ADD CLASS PERFORMANCE ==========
exports.addClassPerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { month, year, participationScore, homeworkCompletion, disciplineScore, extraCurricular, remarks } = req.body;
    const userId = req.user._id;

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    // Check if performance already added for this month
    const existingPerformance = performanceRecord.classPerformance.find(
      cp => cp.month === month && cp.year === year
    );

    if (existingPerformance) {
      return res.status(400).json({
        success: false,
        error: 'Class performance already added for this month'
      });
    }

    performanceRecord.classPerformance.push({
      month,
      year,
      participationScore,
      homeworkCompletion,
      disciplineScore,
      extraCurricular,
      remarks,
      evaluatedBy: userId
    });

    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Class performance added successfully',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Add class performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 10. ADD TEACHER REMARK ==========
exports.addTeacherRemark = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { remark, subject, category } = req.body;
    const userId = req.user._id;

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    performanceRecord.teacherRemarks.push({
      teacherId: userId,
      subject,
      remark,
      category,
      date: new Date()
    });

    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Teacher remark added successfully',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Add teacher remark error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 11. UPDATE PERFORMANCE SCORES ==========
exports.updatePerformanceScores = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const { overallScore, academicScore, behaviorScore, attendanceScore } = req.body;
    const userId = req.user._id;

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    // Create or update performance scores
    performanceRecord.performanceScores = {
      overallScore: overallScore || performanceRecord.performanceScores?.overallScore || 0,
      academicScore: academicScore || performanceRecord.performanceScores?.academicScore || 0,
      behaviorScore: behaviorScore || performanceRecord.performanceScores?.behaviorScore || 0,
      attendanceScore: attendanceScore || performanceRecord.performanceScores?.attendanceScore || 0,
      lastUpdated: new Date()
    };

    performanceRecord.updatedBy = userId;
    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Performance scores updated successfully',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Update performance scores error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 12. GET STUDENT PERFORMANCE ==========
exports.getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const performanceRecord = await StudentPerformance.findOne({ studentId })
      .populate('studentId', 'name rollNumber email class section')
      .populate('attendance.markedBy', 'name role')
      .populate('examResults.uploadedBy', 'name role')
      .populate('classPerformance.evaluatedBy', 'name role')
      .populate('teacherRemarks.teacherId', 'name role')
      .populate('attendanceFiles.uploadedBy', 'name role')
      .populate('createdBy', 'name role')
      .populate('updatedBy', 'name role');

    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    res.json({
      success: true,
      data: performanceRecord
    });
  } catch (error) {
    console.error('Get student performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 13. GET CLASS PERFORMANCE ==========
exports.getClassPerformance = async (req, res) => {
  try {
    const { class: studentClass, section, academicYear } = req.query;

    const query = {};
    if (studentClass) query.class = studentClass;
    if (section) query.section = section;
    if (academicYear) query.academicYear = academicYear;

    const performanceRecords = await StudentPerformance.find(query)
      .populate('studentId', 'name rollNumber email')
      .select('studentId attendancePercentage averageScore performanceScores class section academicYear studentName rollNumber studentEmail');

    res.json({
      success: true,
      count: performanceRecords.length,
      data: performanceRecords
    });
  } catch (error) {
    console.error('Get class performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 14. DELETE ATTENDANCE FILE ==========
exports.deleteAttendanceFile = async (req, res) => {
  try {
    const { performanceId, fileId } = req.params;
    const userId = req.user._id;

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    // Find the file
    const fileIndex = performanceRecord.attendanceFiles.findIndex(
      file => file._id.toString() === fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const fileToDelete = performanceRecord.attendanceFiles[fileIndex];

    // Check if user is authorized to delete
    if (fileToDelete.uploadedBy.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this file'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(fileToDelete.filePath)) {
      fs.unlinkSync(fileToDelete.filePath);
    }

    // Remove file from array
    performanceRecord.attendanceFiles.splice(fileIndex, 1);
    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Attendance file deleted successfully'
    });
  } catch (error) {
    console.error('Delete attendance file error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 15. DOWNLOAD ATTENDANCE FILE ==========
exports.downloadAttendanceFile = async (req, res) => {
  try {
    const { performanceId, fileId } = req.params;

    const performanceRecord = await StudentPerformance.findById(performanceId);
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    const file = performanceRecord.attendanceFiles.find(
      f => f._id.toString() === fileId
    );

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    if (!fs.existsSync(file.filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File does not exist on server'
      });
    }

    res.download(file.filePath, file.fileName);
  } catch (error) {
    console.error('Download attendance file error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== 16. GET PERFORMANCE STATISTICS ==========
exports.getPerformanceStatistics = async (req, res) => {
  try {
    const { studentId } = req.params;

    const performanceRecord = await StudentPerformance.findOne({ studentId });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Performance record not found'
      });
    }

    // Calculate subject-wise performance
    const subjectPerformance = {};
    if (performanceRecord.examResults && performanceRecord.examResults.length > 0) {
      performanceRecord.examResults.forEach(exam => {
        exam.subjects.forEach(subject => {
          if (!subjectPerformance[subject.subjectName]) {
            subjectPerformance[subject.subjectName] = {
              totalExams: 0,
              totalMarks: 0,
              obtainedMarks: 0,
              highestScore: 0,
              lowestScore: Infinity
            };
          }
          
          subjectPerformance[subject.subjectName].totalExams++;
          subjectPerformance[subject.subjectName].totalMarks += subject.totalMarks;
          subjectPerformance[subject.subjectName].obtainedMarks += subject.obtainedMarks;
          subjectPerformance[subject.subjectName].highestScore = Math.max(
            subjectPerformance[subject.subjectName].highestScore,
            subject.obtainedMarks
          );
          subjectPerformance[subject.subjectName].lowestScore = Math.min(
            subjectPerformance[subject.subjectName].lowestScore,
            subject.obtainedMarks
          );
        });
      });
    }

    // Calculate average by subject
    Object.keys(subjectPerformance).forEach(subject => {
      const data = subjectPerformance[subject];
      data.averageScore = data.obtainedMarks / data.totalExams;
      data.averagePercentage = (data.obtainedMarks / data.totalMarks) * 100;
      if (data.lowestScore === Infinity) data.lowestScore = 0;
    });

    const statistics = {
      studentInfo: {
        name: performanceRecord.studentName,
        email: performanceRecord.studentEmail,
        rollNumber: performanceRecord.rollNumber,
        class: performanceRecord.class,
        section: performanceRecord.section
      },
      attendance: {
        totalPresent: performanceRecord.totalPresent,
        totalAbsent: performanceRecord.totalAbsent,
        attendancePercentage: performanceRecord.attendancePercentage,
        totalDays: performanceRecord.attendance.length,
        monthlySummary: performanceRecord.monthlyAttendance.map(ma => ({
          month: ma.month,
          year: ma.year,
          workingDays: ma.workingDays,
          presentDays: ma.presentDays,
          percentage: ma.attendancePercentage
        }))
      },
      exams: {
        totalExams: performanceRecord.examResults.length,
        averageScore: performanceRecord.averageScore,
        examTypes: performanceRecord.examResults.reduce((acc, exam) => {
          acc[exam.examType] = (acc[exam.examType] || 0) + 1;
          return acc;
        }, {}),
        subjectPerformance: subjectPerformance
      },
      classPerformance: {
        totalRecords: performanceRecord.classPerformance.length,
        averageParticipation: performanceRecord.classPerformance.reduce((sum, cp) => sum + cp.participationScore, 0) / performanceRecord.classPerformance.length || 0,
        averageHomework: performanceRecord.classPerformance.reduce((sum, cp) => sum + cp.homeworkCompletion, 0) / performanceRecord.classPerformance.length || 0,
        monthlyBreakdown: performanceRecord.classPerformance.map(cp => ({
          month: cp.month,
          year: cp.year,
          participation: cp.participationScore,
          homework: cp.homeworkCompletion
        }))
      },
      performanceScores: performanceRecord.performanceScores,
      teacherRemarks: {
        totalRemarks: performanceRecord.teacherRemarks.length,
        byCategory: performanceRecord.teacherRemarks.reduce((acc, remark) => {
          acc[remark.category] = (acc[remark.category] || 0) + 1;
          return acc;
        }, {})
      }
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get performance statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};