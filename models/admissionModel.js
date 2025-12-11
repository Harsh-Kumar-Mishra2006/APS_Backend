const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  // Admission Details
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  
  // Course Information
  courseName: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  
  // For which class
  forClass: {
    type: String,
    required: [true, 'Class is required'],
    enum: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  },
  
  // Stream for +2
  stream: {
    type: String,
    enum: ['Science', 'Commerce', 'Humanities', null],
    default: null
  },
  
  // Academic Year
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    default: '2026-27'
  },
  
  // Important Dates
  dates: {
    applicationStart: {
      type: Date,
      required: true
    },
    applicationEnd: {
      type: Date,
      required: true
    },
    examDate: {
      type: Date,
      required: true
    },
    interviewDate: {
      type: Date,
      required: true
    },
    admissionStart: {
      type: Date,
      required: true
    }
  },
  
  // Fee Structure
  fees: {
    admissionFee: {
      type: Number,
      default: 0
    },
    monthlyFee: {
      type: Number,
      required: true
    },
    quarterlyFee: Number,
    yearlyFee: Number,
    // Additional fees
    labFee: {
      type: Number,
      default: 0
    },
    computerFee: {
      type: Number,
      default: 0
    },
    otherCharges: {
      type: Number,
      default: 0
    }
  },
  
  // Important Information
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  
  // Eligibility
  eligibility: {
    minAge: Number,
    maxAge: Number,
    minPercentage: Number,
    otherRequirements: String
  },
  
  // Seats
  seats: {
    total: {
      type: Number,
      required: true,
      default: 50
    },
    available: {
      type: Number,
      default: 50
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Created by Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Admission', admissionSchema);