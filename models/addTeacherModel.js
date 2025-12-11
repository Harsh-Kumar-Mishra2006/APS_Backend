const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\d{10,15}$/, 'Please enter a valid phone number (10-15 digits)']
  },
  educationalQualifications: {
    type: [String],
    required: [true, 'Educational qualifications are required'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one educational qualification is required'
    }
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    enum: [
      'Principal',
      'Vice Principal', 
      'Senior Teacher',
      'Teacher',
      'Assistant Teacher',
      'Head of Department',
      'Coordinator'
    ],
    default: 'Teacher'
  },
  dateOfAppointment: {
    type: Date,
    required: [true, 'Date of appointment is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  profilePhoto: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Link to User model
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

// Index for better query performance
teacherSchema.index({ email: 1 });
teacherSchema.index({ subject: 1 });
teacherSchema.index({ designation: 1 });
teacherSchema.index({ isActive: 1 });
teacherSchema.index({ userId: 1 });

module.exports = mongoose.model("Teacher", teacherSchema);