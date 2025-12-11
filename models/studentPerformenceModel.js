// models/studentPerformanceModel.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

// New schema for month-wise attendance
const monthlyAttendanceSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  workingDays: {
    type: Number,
    required: true,
    min: 0,
    max: 31
  },
  presentDays: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const examResultSchema = new mongoose.Schema({
  examType: {
    type: String,
    enum: ['mid-semester', 'end-semester', 'unit-test', 'assignment', 'practical', 'project'],
    required: true
  },
  examMonth: {
    type: String,
    required: true,
    trim: true
  },
  examYear: {
    type: Number,
    required: true
  },
  subjects: [{
    subjectName: {
      type: String,
      required: true,
      trim: true
    },
    totalMarks: {
      type: Number,
      required: true
    },
    obtainedMarks: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number
    },
    grade: {
      type: String,
      trim: true
    },
    subjectCode: {
      type: String,
      trim: true
    }
  }],
  overallPercentage: {
    type: Number
  },
  overallGrade: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  conductedDate: {
    type: Date
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const classPerformanceSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  participationScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  homeworkCompletion: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  disciplineScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  extraCurricular: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const teacherRemarkSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    trim: true
  },
  remark: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['academic', 'behavior', 'improvement', 'achievement'],
    default: 'academic'
  }
});

const performanceScoreSchema = new mongoose.Schema({
  overallScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  academicScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  behaviorScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  attendanceScore: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const attendanceFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  forMonth: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  }
});

const studentPerformanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  studentEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  
  // Attendance records
  attendance: [attendanceSchema],
  
  // Monthly attendance summary
  monthlyAttendance: [monthlyAttendanceSchema],
  
  // Exam results
  examResults: [examResultSchema],
  
  // Class performance
  classPerformance: [classPerformanceSchema],
  
  // Teacher remarks
  teacherRemarks: [teacherRemarkSchema],
  
  // Performance scores
  performanceScores: performanceScoreSchema,
  
  // Attendance files
  attendanceFiles: [attendanceFileSchema],
  
  // Statistics
  totalPresent: {
    type: Number,
    default: 0
  },
  totalAbsent: {
    type: Number,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
studentPerformanceSchema.index({ studentId: 1 });
studentPerformanceSchema.index({ studentEmail: 1 }, { unique: true });
studentPerformanceSchema.index({ academicYear: 1, class: 1, section: 1 });
studentPerformanceSchema.index({ 'attendance.date': 1 });
studentPerformanceSchema.index({ 'examResults.examType': 1 });
studentPerformanceSchema.index({ 'monthlyAttendance.month': 1, 'monthlyAttendance.year': 1 });

// Middleware to calculate percentages
studentPerformanceSchema.pre('save', function(next) {
  // Calculate attendance percentage
  if (this.attendance && this.attendance.length > 0) {
    const totalDays = this.attendance.length;
    const presentDays = this.attendance.filter(a => a.status === 'present').length;
    this.totalPresent = presentDays;
    this.totalAbsent = totalDays - presentDays;
    this.attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
  }
  
  // Calculate average score from all subjects in all exams
  if (this.examResults && this.examResults.length > 0) {
    let totalMarks = 0;
    let totalSubjects = 0;
    
    this.examResults.forEach(exam => {
      exam.subjects.forEach(subject => {
        totalMarks += subject.obtainedMarks;
        totalSubjects++;
      });
    });
    
    this.averageScore = totalSubjects > 0 ? totalMarks / totalSubjects : 0;
  }
  
  next();
});

// Static method to get performance by email
studentPerformanceSchema.statics.findByEmail = function(email) {
  return this.findOne({ studentEmail: email.toLowerCase() });
};

// Static method to update monthly attendance
studentPerformanceSchema.statics.updateMonthlyAttendance = async function(studentId, month, year, data) {
  const performance = await this.findOne({ studentId });
  if (!performance) throw new Error('Student performance not found');
  
  const index = performance.monthlyAttendance.findIndex(
    ma => ma.month === month && ma.year === year
  );
  
  if (index === -1) {
    performance.monthlyAttendance.push({
      ...data,
      month,
      year
    });
  } else {
    performance.monthlyAttendance[index] = {
      ...performance.monthlyAttendance[index],
      ...data,
      month,
      year,
      lastUpdated: new Date()
    };
  }
  
  return performance.save();
};

// Check if model already exists before creating
module.exports = mongoose.models.StudentPerformance || mongoose.model('StudentPerformance', studentPerformanceSchema);