// models/approvedEmailModel.js
const mongoose = require('mongoose');

const approvedEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  role: {
    type: String,
    enum: ['teacher', 'parent', 'student'],
    required: [true, 'Role is required']
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auth',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'used'],
    default: 'approved'
  },
  notes: String
}, {
  timestamps: true
});

// Index for better query performance
approvedEmailSchema.index({ email: 1 });
approvedEmailSchema.index({ role: 1 });
approvedEmailSchema.index({ status: 1 });

module.exports = mongoose.model("ApprovedEmail", approvedEmailSchema);