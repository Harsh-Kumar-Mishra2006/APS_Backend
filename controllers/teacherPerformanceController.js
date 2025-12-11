// controllers/teacherPerformanceController.js
const TeacherPerformance = require('../models/teacherPerformanceModel');
const Teacher = require('../models/addTeacherModel');
const User = require('../models/authModel');

// ========== TEACHER PERFORMANCE RECORDS ==========

// Create teacher performance record
exports.createTeacherPerformance = async (req, res) => {
  try {
    const { teacherEmail, teacherName, phoneNumber, subjects, designation, joiningDate, experience, qualification } = req.body;
    const userId = req.user._id;

    // Check if teacher exists in TEACHER model (not User model)
    const teacher = await Teacher.findOne({ 
      email: teacherEmail.toLowerCase()
    });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found. Please add teacher first using Teacher Registration.'
      });
    }

    // Check if performance record already exists
    const existingRecord = await TeacherPerformance.findOne({ teacherEmail: teacherEmail.toLowerCase() });
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: 'Performance record already exists for this teacher'
      });
    }

    // Create new performance record
    const performanceRecord = await TeacherPerformance.create({
      teacherId: teacher._id, // Use Teacher model's ID
      teacherEmail: teacher.email.toLowerCase(),
      teacherName: teacher.name, // Get name from Teacher model
      phoneNumber: teacher.phone, // Get phone from Teacher model
      subjects: Array.isArray(subjects) ? subjects : [subjects],
      designation: teacher.designation, // Get designation from Teacher model
      joiningDate,
      experience,
      qualification,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Teacher performance record created successfully',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Create teacher performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get teacher performance by email
exports.getTeacherPerformance = async (req, res) => {
  try {
    const { email } = req.params;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() })
      .populate({
        path: 'teacherId',
        select: 'name email phone designation subject educationalQualifications',
        model: 'Teacher'
      })
      .populate('monthlyAttendance.updatedBy', 'name email')
      .populate('performanceReviews.reviewedBy', 'name email role')
      .populate('remarks.addedBy', 'name email')
      .populate('subjectAssignments.assignedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Get teacher basic info from Teacher model
    const teacher = await Teacher.findOne({ email: email.toLowerCase() });
    
    res.json({
      success: true,
      data: {
        ...performanceRecord.toObject(),
        teacherBasicInfo: teacher ? {
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          educationalQualifications: teacher.educationalQualifications,
          designation: teacher.designation,
          subject: teacher.subject,
          dateOfAppointment: teacher.dateOfAppointment,
          bio: teacher.bio,
          profilePhoto: teacher.profilePhoto
        } : null
      }
    });
  } catch (error) {
    console.error('Get teacher performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all teachers performance
exports.getAllTeachersPerformance = async (req, res) => {
  try {
    const { year, month, search } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { teacherName: { $regex: search, $options: 'i' } },
        { teacherEmail: { $regex: search, $options: 'i' } },
        { subjects: { $regex: search, $options: 'i' } }
      ];
    }

    const performanceRecords = await TeacherPerformance.find(query)
      .populate({
        path: 'teacherId',
        select: 'name email phone designation subject',
        model: 'Teacher'
      })
      .select('teacherName teacherEmail subjects designation overallAttendancePercentage averagePerformanceScore monthlyAttendance performanceReviews')
      .sort({ createdAt: -1 });

    // Get Teacher model data for each record
    const enhancedRecords = await Promise.all(
      performanceRecords.map(async (record) => {
        const teacher = await Teacher.findOne({ email: record.teacherEmail });
        return {
          ...record.toObject(),
          teacherBasicInfo: teacher ? {
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone,
            designation: teacher.designation,
            subject: teacher.subject,
            educationalQualifications: teacher.educationalQualifications
          } : null
        };
      })
    );

    res.json({
      success: true,
      count: enhancedRecords.length,
      data: enhancedRecords
    });
  } catch (error) {
    console.error('Get all teachers performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get teachers without performance records
exports.getTeachersWithoutPerformance = async (req, res) => {
  try {
    // Get all teachers from Teacher model
    const allTeachers = await Teacher.find({ isActive: true });
    
    // Get all teachers with performance records
    const teachersWithPerformance = await TeacherPerformance.find({})
      .select('teacherEmail');
    
    const teacherEmailsWithPerformance = teachersWithPerformance.map(t => t.teacherEmail.toLowerCase());
    
    // Find teachers without performance records
    const teachersWithoutPerformance = allTeachers.filter(teacher => 
      !teacherEmailsWithPerformance.includes(teacher.email.toLowerCase())
    );

    res.json({
      success: true,
      count: teachersWithoutPerformance.length,
      data: teachersWithoutPerformance
    });
  } catch (error) {
    console.error('Get teachers without performance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create performance record from existing teacher
exports.createPerformanceFromTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const userId = req.user._id;

    // Get teacher from Teacher model
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    // Check if performance record already exists
    const existingRecord = await TeacherPerformance.findOne({ 
      teacherEmail: teacher.email.toLowerCase() 
    });
    
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        error: 'Performance record already exists for this teacher'
      });
    }

    // Create performance record from teacher data
    const performanceRecord = await TeacherPerformance.create({
      teacherId: teacher._id,
      teacherEmail: teacher.email.toLowerCase(),
      teacherName: teacher.name,
      phoneNumber: teacher.phone,
      subjects: [teacher.subject], // Convert single subject to array
      designation: teacher.designation,
      // Leave these as empty/default, admin will fill them
      joiningDate: null,
      experience: 0,
      qualification: teacher.educationalQualifications.join(', '),
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Teacher performance record created from teacher data',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Create performance from teacher error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== TEACHER INFORMATION ==========

// Update teacher basic info
exports.updateTeacherInfo = async (req, res) => {
  try {
    const { email } = req.params;
    const updateData = req.body;
    const userId = req.user._id;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Also update Teacher model for consistency
    const teacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (teacher) {
      // Update Teacher model with basic info
      if (updateData.teacherName) teacher.name = updateData.teacherName;
      if (updateData.phoneNumber) teacher.phone = updateData.phoneNumber;
      if (updateData.designation) teacher.designation = updateData.designation;
      if (updateData.subjects) teacher.subject = Array.isArray(updateData.subjects) 
        ? updateData.subjects.join(', ') 
        : updateData.subjects;
      
      await teacher.save();
    }

    // Update TeacherPerformance model
    const allowedUpdates = ['teacherName', 'phoneNumber', 'subjects', 'designation', 'qualification'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        performanceRecord[field] = updateData[field];
      }
    });

    performanceRecord.updatedBy = userId;
    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Teacher information updated successfully in both records',
      data: performanceRecord
    });
  } catch (error) {
    console.error('Update teacher info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== ATTENDANCE MANAGEMENT ==========

// Update monthly attendance
exports.updateMonthlyAttendance = async (req, res) => {
  try {
    const { email } = req.params;
    const { month, year, workingDays, presentDays, leaveDays, halfDays, remarks } = req.body;
    const userId = req.user._id;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Month and year are required'
      });
    }

    if (presentDays > workingDays) {
      return res.status(400).json({
        success: false,
        error: 'Present days cannot exceed working days'
      });
    }

    if (leaveDays + halfDays > workingDays - presentDays) {
      return res.status(400).json({
        success: false,
        error: 'Leave days and half days exceed available days'
      });
    }

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Calculate attendance percentage
    const effectiveDays = presentDays + (halfDays * 0.5);
    const attendancePercentage = workingDays > 0 ? (effectiveDays / workingDays) * 100 : 0;

    const attendanceData = {
      month,
      year,
      workingDays,
      presentDays,
      leaveDays: leaveDays || 0,
      halfDays: halfDays || 0,
      attendancePercentage,
      remarks: remarks || '',
      updatedBy: userId
    };

    // Find existing attendance record
    const existingIndex = performanceRecord.monthlyAttendance.findIndex(
      a => a.month === month && a.year === year
    );

    if (existingIndex === -1) {
      // Add new attendance record
      performanceRecord.monthlyAttendance.push(attendanceData);
    } else {
      // Update existing record
      performanceRecord.monthlyAttendance[existingIndex] = {
        ...performanceRecord.monthlyAttendance[existingIndex].toObject(),
        ...attendanceData,
        updatedAt: new Date()
      };
    }

    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Monthly attendance updated successfully',
      data: performanceRecord.monthlyAttendance.find(
        a => a.month === month && a.year === year
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

// Get monthly attendance
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { email } = req.params;
    const { month, year } = req.query;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    let attendanceData = performanceRecord.monthlyAttendance || [];
    
    // Filter by month/year if provided
    if (month) {
      attendanceData = attendanceData.filter(a => a.month === month);
    }
    if (year) {
      attendanceData = attendanceData.filter(a => a.year === parseInt(year));
    }

    // Sort by year and month (newest first)
    attendanceData.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      return months.indexOf(b.month) - months.indexOf(a.month);
    });

    res.json({
      success: true,
      count: attendanceData.length,
      data: attendanceData
    });
  } catch (error) {
    console.error('Get monthly attendance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== PERFORMANCE REVIEWS ==========

// Add performance review
exports.addPerformanceReview = async (req, res) => {
  try {
    const { email } = req.params;
    const { category, month, year, scores, feedback, strengths, areasOfImprovement } = req.body;
    const userId = req.user._id;

    if (!category || !month || !year) {
      return res.status(400).json({
        success: false,
        error: 'Category, month, and year are required'
      });
    }

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Check if review already exists for this category, month, and year
    const existingReview = performanceRecord.performanceReviews.find(
      r => r.category === category && r.month === month && r.year === year
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: `Performance review already exists for ${category} in ${month} ${year}`
      });
    }

    // Calculate overall score
    const scoreValues = Object.values(scores);
    const overallScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;

    const reviewData = {
      category,
      month,
      year,
      scores,
      overallScore,
      feedback,
      strengths: Array.isArray(strengths) ? strengths : [strengths],
      areasOfImprovement: Array.isArray(areasOfImprovement) ? areasOfImprovement : [areasOfImprovement],
      reviewedBy: userId
    };

    performanceRecord.performanceReviews.push(reviewData);
    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Performance review added successfully',
      data: reviewData
    });
  } catch (error) {
    console.error('Add performance review error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get performance reviews
exports.getPerformanceReviews = async (req, res) => {
  try {
    const { email } = req.params;
    const { category, month, year } = req.query;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    let reviews = performanceRecord.performanceReviews || [];
    
    // Filter by category, month, year if provided
    if (category) {
      reviews = reviews.filter(r => r.category === category);
    }
    if (month) {
      reviews = reviews.filter(r => r.month === month);
    }
    if (year) {
      reviews = reviews.filter(r => r.year === parseInt(year));
    }

    // Sort by date (newest first)
    reviews.sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Get performance reviews error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== REMARKS & COMMENTS ==========

// Add teacher remark
exports.addTeacherRemark = async (req, res) => {
  try {
    const { email } = req.params;
    const { remark, category } = req.body;
    const userId = req.user._id;

    if (!remark || remark.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Remark text is required'
      });
    }

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    const remarkData = {
      remark: remark.trim(),
      category: category || 'general',
      addedBy: userId
    };

    performanceRecord.remarks.push(remarkData);
    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Remark added successfully',
      data: performanceRecord.remarks[performanceRecord.remarks.length - 1]
    });
  } catch (error) {
    console.error('Add teacher remark error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get teacher remarks
exports.getTeacherRemarks = async (req, res) => {
  try {
    const { email } = req.params;
    const { category } = req.query;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    let remarks = performanceRecord.remarks || [];
    
    // Filter by category if provided
    if (category) {
      remarks = remarks.filter(r => r.category === category);
    }

    // Sort by date (newest first)
    remarks.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      count: remarks.length,
      data: remarks
    });
  } catch (error) {
    console.error('Get teacher remarks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== SUBJECT ASSIGNMENT ==========

// Assign subject to teacher
exports.assignSubject = async (req, res) => {
  try {
    const { email } = req.params;
    const { subject, class: teacherClass, section, academicYear } = req.body;
    const userId = req.user._id;

    if (!subject || !teacherClass || !academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Subject, class, and academic year are required'
      });
    }

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Check if subject already assigned for this academic year
    const existingAssignment = performanceRecord.subjectAssignments.find(
      a => a.subject === subject && 
           a.class === teacherClass && 
           a.academicYear === academicYear &&
           a.isActive
    );

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Subject already assigned to this teacher for the selected academic year'
      });
    }

    const assignmentData = {
      subject,
      class: teacherClass,
      section: section || '',
      academicYear,
      assignedBy: userId
    };

    performanceRecord.subjectAssignments.push(assignmentData);
    await performanceRecord.save();

    res.json({
      success: true,
      message: 'Subject assigned successfully',
      data: performanceRecord.subjectAssignments[performanceRecord.subjectAssignments.length - 1]
    });
  } catch (error) {
    console.error('Assign subject error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get teacher subject assignments
exports.getSubjectAssignments = async (req, res) => {
  try {
    const { email } = req.params;
    const { academicYear, isActive } = req.query;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    let assignments = performanceRecord.subjectAssignments || [];
    
    // Filter by academic year if provided
    if (academicYear) {
      assignments = assignments.filter(a => a.academicYear === academicYear);
    }
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      const active = isActive === 'true';
      assignments = assignments.filter(a => a.isActive === active);
    }

    // Sort by academic year (newest first) and then by class
    assignments.sort((a, b) => {
      if (b.academicYear !== a.academicYear) {
        return b.academicYear.localeCompare(a.academicYear);
      }
      return a.class.localeCompare(b.class);
    });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Get subject assignments error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ========== STATISTICS & DASHBOARD ==========

// Get teacher statistics
exports.getTeacherStatistics = async (req, res) => {
  try {
    const { email } = req.params;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Calculate additional statistics
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    
    const currentMonthAttendance = performanceRecord.monthlyAttendance.find(
      a => a.month === currentMonth && a.year === currentYear
    );

    const recentReviews = performanceRecord.performanceReviews
      .sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt))
      .slice(0, 3);

    const statistics = {
      basicInfo: {
        name: performanceRecord.teacherName,
        email: performanceRecord.teacherEmail,
        designation: performanceRecord.designation,
        subjects: performanceRecord.subjects
      },
      attendance: {
        overallPercentage: performanceRecord.overallAttendancePercentage,
        totalWorkingDays: performanceRecord.totalWorkingDays,
        totalPresentDays: performanceRecord.totalPresentDays,
        currentMonth: currentMonthAttendance ? {
          month: currentMonthAttendance.month,
          year: currentMonthAttendance.year,
          attendancePercentage: currentMonthAttendance.attendancePercentage,
          presentDays: currentMonthAttendance.presentDays,
          workingDays: currentMonthAttendance.workingDays
        } : null
      },
      performance: {
        averageScore: performanceRecord.averagePerformanceScore,
        totalReviews: performanceRecord.performanceReviews.length,
        recentReviews: recentReviews
      },
      assignments: {
        totalAssignments: performanceRecord.subjectAssignments.length,
        activeAssignments: performanceRecord.subjectAssignments.filter(a => a.isActive).length
      }
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get teacher statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get teacher dashboard data
exports.getTeacherDashboard = async (req, res) => {
  try {
    const { email } = req.params;

    const performanceRecord = await TeacherPerformance.findOne({ teacherEmail: email.toLowerCase() });
    if (!performanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Teacher performance record not found'
      });
    }

    // Get teacher basic info from Teacher model
    const teacher = await Teacher.findOne({ email: email.toLowerCase() });

    // Get recent 6 months attendance
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentAttendance = performanceRecord.monthlyAttendance
      .sort((a, b) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        if (a.year !== b.year) return b.year - a.year;
        return months.indexOf(b.month) - months.indexOf(a.month);
      })
      .slice(0, 6);

    // Get recent performance reviews
    const recentPerformanceReviews = performanceRecord.performanceReviews
      .sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt))
      .slice(0, 3);

    // Get active subject assignments
    const activeAssignments = performanceRecord.subjectAssignments
      .filter(a => a.isActive)
      .slice(0, 5);

    // Get recent remarks
    const recentRemarks = performanceRecord.remarks
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    const dashboardData = {
      teacherInfo: {
        name: teacher?.name || performanceRecord.teacherName,
        email: teacher?.email || performanceRecord.teacherEmail,
        designation: teacher?.designation || performanceRecord.designation,
        profilePhoto: teacher?.profilePhoto
      },
      summary: {
        attendancePercentage: performanceRecord.overallAttendancePercentage,
        performanceScore: performanceRecord.averagePerformanceScore,
        totalSubjects: performanceRecord.subjects.length,
        activeAssignments: activeAssignments.length
      },
      recentAttendance,
      recentPerformanceReviews,
      activeAssignments,
      recentRemarks
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get teacher dashboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;