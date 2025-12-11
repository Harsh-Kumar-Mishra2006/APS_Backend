// models/teacherPerformanceModel.js
const mongoose = require('mongoose');

// Monthly attendance schema
const teacherAttendanceSchema = new mongoose.Schema({
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
    min: 1,
    max: 31
  },
  presentDays: {
    type: Number,
    required: true,
    min: 0
  },
  leaveDays: {
    type: Number,
    default: 0,
    min: 0
  },
  halfDays: {
    type: Number,
    default: 0,
    min: 0
  },
  attendancePercentage: {
    type: Number,
    min: 0,
    max: 100
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
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Performance review scores schema
const performanceScoreSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['principal', 'colleague', 'student', 'self'],
    required: true
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  scores: {
    punctuality: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    subjectKnowledge: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    teachingMethodology: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    classManagement: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    studentEngagement: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    communicationSkills: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    assessmentQuality: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    professionalDevelopment: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    }
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 10
  },
  feedback: {
    type: String,
    trim: true
  },
  strengths: [{
    type: String,
    trim: true
  }],
  areasOfImprovement: [{
    type: String,
    trim: true
  }],
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedAt: {
    type: Date,
    default: Date.now
  }
});

// Teacher remarks/comments schema
const teacherRemarkSchema = new mongoose.Schema({
  remark: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['achievement', 'improvement', 'general', 'disciplinary'],
    default: 'general'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Subject assignment schema
const subjectAssignmentSchema = new mongoose.Schema({
  subject: {
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
    trim: true
  },
  academicYear: {
    type: String,
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Main teacher performance schema
const teacherPerformanceSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  teacherEmail: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  teacherName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  subjects: [{
    type: String,
    trim: true
  }],
  designation: {
    type: String,
    trim: true
  },
  joiningDate: {
    type: Date
  },
  experience: {
    type: Number,
    default: 0
  },
  qualification: {
    type: String,
    trim: true
  },
  
  // Monthly attendance records
  monthlyAttendance: [teacherAttendanceSchema],
  
  // Performance reviews
  performanceReviews: [performanceScoreSchema],
  
  // Teacher remarks
  remarks: [teacherRemarkSchema],
  
  // Subject assignments
  subjectAssignments: [subjectAssignmentSchema],
  
  // Statistics
  overallAttendancePercentage: {
    type: Number,
    default: 0
  },
  averagePerformanceScore: {
    type: Number,
    default: 0
  },
  totalWorkingDays: {
    type: Number,
    default: 0
  },
  totalPresentDays: {
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
teacherPerformanceSchema.index({ teacherEmail: 1 });
teacherPerformanceSchema.index({ teacherId: 1 });
teacherPerformanceSchema.index({ 'monthlyAttendance.month': 1, 'monthlyAttendance.year': 1 });
teacherPerformanceSchema.index({ 'performanceReviews.month': 1, 'performanceReviews.year': 1 });

// Middleware to calculate statistics
teacherPerformanceSchema.pre('save', function(next) {
  // Calculate overall attendance percentage
  if (this.monthlyAttendance && this.monthlyAttendance.length > 0) {
    const totalWorkingDays = this.monthlyAttendance.reduce((sum, record) => sum + record.workingDays, 0);
    const totalPresentDays = this.monthlyAttendance.reduce((sum, record) => sum + record.presentDays, 0);
    
    this.totalWorkingDays = totalWorkingDays;
    this.totalPresentDays = totalPresentDays;
    this.overallAttendancePercentage = totalWorkingDays > 0 ? (totalPresentDays / totalWorkingDays) * 100 : 0;
  }
  
  // Calculate average performance score
  if (this.performanceReviews && this.performanceReviews.length > 0) {
    const totalScores = this.performanceReviews.reduce((sum, review) => sum + review.overallScore, 0);
    this.averagePerformanceScore = totalScores / this.performanceReviews.length;
  }
  
  next();
});

// Static method to update monthly attendance
teacherPerformanceSchema.statics.updateMonthlyAttendance = async function(teacherEmail, month, year, data) {
  const teacher = await this.findOne({ teacherEmail });
  if (!teacher) throw new Error('Teacher not found');
  
  const attendancePercentage = data.workingDays > 0 
    ? ((data.presentDays + (data.halfDays * 0.5)) / data.workingDays) * 100 
    : 0;
  
  const attendanceData = {
    month,
    year,
    workingDays: data.workingDays,
    presentDays: data.presentDays,
    leaveDays: data.leaveDays || 0,
    halfDays: data.halfDays || 0,
    attendancePercentage,
    remarks: data.remarks || ''
  };
  
  const existingIndex = teacher.monthlyAttendance.findIndex(
    a => a.month === month && a.year === year
  );
  
  if (existingIndex === -1) {
    teacher.monthlyAttendance.push(attendanceData);
  } else {
    teacher.monthlyAttendance[existingIndex] = attendanceData;
  }
  
  return teacher.save();
};

// Static method to add performance review
teacherPerformanceSchema.statics.addPerformanceReview = async function(teacherEmail, reviewData) {
  const teacher = await this.findOne({ teacherEmail });
  if (!teacher) throw new Error('Teacher not found');
  
  // Calculate overall score
  const scores = reviewData.scores;
  const scoreValues = Object.values(scores);
  const overallScore = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
  
  const review = {
    ...reviewData,
    overallScore
  };
  
  teacher.performanceReviews.push(review);
  return teacher.save();
};

// Check if model already exists before creating
module.exports = mongoose.models.TeacherPerformance || mongoose.model('TeacherPerformance', teacherPerformanceSchema);