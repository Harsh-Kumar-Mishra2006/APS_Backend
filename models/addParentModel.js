// models/addParentModel.js
const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
  // Student Info (Optional - for linking to existing students)
  studentName: {
    type: String,
    trim: true
  },
  studentEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  studentRollNumber: {
    type: String,
    trim: true
  },
  
  // Parent Info (Required)
  parentName: {
    type: String,
    required: [true, 'Parent name is required'],
    trim: true
  },
  parentEmail: {
    type: String,
    required: [true, 'Parent email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  parentPhone: {
    type: String,
    required: [true, 'Parent phone is required'],
    trim: true
  },
  relationship: {
    type: String,
    default: 'Parent',
    trim: true
  },
  address: {
    type: Object,
    default: {}
  },
  occupation: {
    type: String,
    default: '',
    trim: true
  },
  emergencyContact: {
    type: Object,
    default: {}
  },
  profilePhoto: {
    type: String,
    default: null
  },
  
  // Links
  linkedStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  isLinkedToStudent: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Parent', parentSchema);