const Teacher = require('../models/addTeacherModel');
const User = require('../models/authModel');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Add new teacher
const addTeacher = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      educationalQualifications,
      designation,
      dateOfAppointment,
      subject,
      bio
    } = req.body;

    // Check if teacher with email already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Teacher with this email already exists'
      });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Parse educational qualifications if it's a string
    let qualifications = educationalQualifications;
    if (typeof educationalQualifications === 'string') {
      try {
        qualifications = JSON.parse(educationalQualifications);
      } catch (error) {
        qualifications = [educationalQualifications];
      }
    }

    // Generate temporary password
    const tempPassword = User.generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Generate username from email
    const username = email.split('@')[0];

    // Create User account FIRST
    const user = await User.create({
      name,
      email,
      username,
      phone,
      password: hashedPassword,
      role: 'teacher',
      teacherSubjects: subject ? [subject] : [],
      isDemoAdmin: false,
      isActive: true,
      addedBy: req.user._id
    });

    // Create Teacher entry
    const teacher = await Teacher.create({
      name,
      email,
      phone,
      educationalQualifications: qualifications,
      designation,
      dateOfAppointment,
      subject,
      bio,
      profilePhoto: req.file ? `/uploads/teachers/${req.file.filename}` : null,
      userId: user._id,
      createdBy: req.user._id
    });

    // Update user with teacher profile reference
    user.teacherProfile = teacher._id;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        teacher,
        loginCredentials: {
          email: user.email,
          username: user.username,
          temporaryPassword: tempPassword,
          registrationLink: '/complete-registration', // Add this link
          temporaryAccessCode: tempPassword, // For verification if needed
          message: 'Teacher must complete registration to activate account'
        }
      },
      message: 'Teacher added successfully. Login credentials generated.'
    });

  } catch (error) {
    console.error('Add teacher error:', error);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists in the system'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while adding teacher'
    });
  }
};

// Get all teachers
const getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    // Build search query
    const searchQuery = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const teachers = await Teacher.find(searchQuery)
      .populate('createdBy', 'name email')
      .populate('userId', 'username isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Teacher.countDocuments(searchQuery);

    res.json({
      success: true,
      data: teachers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching teachers'
    });
  }
};

// Get single teacher
const getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('userId', 'username isActive lastLogin');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      data: teacher
    });

  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching teacher'
    });
  }
};

// Update teacher
const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    // Check if email is being changed
    if (req.body.email && req.body.email !== teacher.email) {
      const existingTeacher = await Teacher.findOne({ email: req.body.email });
      if (existingTeacher) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Teacher with this email already exists'
        });
      }

      // Update User email if it exists
      const user = await User.findById(teacher.userId);
      if (user) {
        user.email = req.body.email;
        user.username = req.body.email.split('@')[0];
        await user.save();
      }
    }

    // Parse educational qualifications if provided
    if (req.body.educationalQualifications) {
      let qualifications = req.body.educationalQualifications;
      if (typeof qualifications === 'string') {
        try {
          qualifications = JSON.parse(qualifications);
        } catch (error) {
          qualifications = [qualifications];
        }
      }
      req.body.educationalQualifications = qualifications;
    }

    // Handle profile photo update
    if (req.file) {
      if (teacher.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', teacher.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      req.body.profilePhoto = `/uploads/teachers/${req.file.filename}`;
    }

    // Update teacher subjects in User model
    if (req.body.subject) {
      const user = await User.findById(teacher.userId);
      if (user) {
        user.teacherSubjects = [req.body.subject];
        await user.save();
      }
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('userId', 'username isActive lastLogin');

    res.json({
      success: true,
      data: updatedTeacher,
      message: 'Teacher updated successfully'
    });

  } catch (error) {
    console.error('Update teacher error:', error);
    
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while updating teacher'
    });
  }
};

// Delete teacher
const deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher not found'
      });
    }

    // Delete associated User account
    await User.findByIdAndDelete(teacher.userId);

    // Delete profile photo if exists
    if (teacher.profilePhoto) {
      const photoPath = path.join(__dirname, '..', teacher.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await Teacher.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Teacher and associated user account deleted successfully'
    });

  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting teacher'
    });
  }
};

module.exports = {
  addTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  deleteTeacher
};