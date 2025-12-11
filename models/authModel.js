const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  password: {
  type: String,
  required: [true, 'Password is required'],
  minlength: 6,
  default: ''  // Add this
},
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'parent'],
    required: true
  },
  isDemoAdmin: {
    type: Boolean,
    default: false
  },
   isEmailApproved: {
    type: Boolean,
    default: true // Set to true for existing users
  },
  // Role-specific fields
  studentId: {
    type: String,
    sparse: true
  },
  parentOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  teacherSubjects: [{
    type: String
  }],
  classGrade: {
    type: String,
    sparse: true
  },
  // Status fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  // Link to detailed models
  teacherProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    sparse: true
  },
  studentProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    sparse: true
  },
  parentProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    sparse: true
  },
  resetPasswordToken: {
  type: String,
  sparse: true
},
resetPasswordExpires: {
  type: Date,
  sparse: true
}
}, {
  timestamps: true // This automatically adds createdAt and updatedAt
});

// CRITICAL FIX: Use different approach for pre-save hook
if (!userSchema.path('_id')) {
  // Define the pre-save hook only if schema is not already compiled
  // In authModel.js - update pre-save hook:
userSchema.pre('save', async function(next) {
  console.log('Pre-save hook triggered for user:', this.email);
  
  // Only hash password if it's modified, not empty, and not already hashed
  if (!this.isModified('password') || this.password === '' || this.password === null) {
    console.log('Password not modified or empty, skipping hash');
    return next();
  }
  
  // Check if password is already hashed (starts with $2b$)
  if (this.password.startsWith('$2b$')) {
    console.log('Password already hashed, skipping');
    return next();
  }
  
  try {
    console.log('Hashing password for user:', this.email);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully');
    next();
  } catch (error) {
    console.error('Password hashing error:', error);
    next(error);
  }
});
}

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// In authModel.js - FIXED
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  
  return jwt.sign(
    { 
      userId: this._id.toString(), 
      email: this.email,
      role: this.role,
      username: this.username,
      name: this.name
    },
    process.env.JWT_SECRET || 'Harsh2006@', // HARDCODE to match .env
    { expiresIn: '7d' } // Standard expiry
  );
};

// Generate temporary password
userSchema.statics.generateTemporaryPassword = function() {
  const length = 8;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// IMPORTANT: Debug logging
console.log('Loading User model. mongoose.models.User exists?', !!mongoose.models.User);

// Check if model exists, if not create it
let User;
try {
  // Try to get existing model
  User = mongoose.model('User');
  console.log('Found existing User model');
} catch (error) {
  // Model doesn't exist, create it
  console.log('Creating new User model');
  User = mongoose.model('User', userSchema);
}

module.exports = User;