const Student = require('../models/addStudentModel');
const User = require('../models/authModel');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Add new student
const addStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      rollNumber,
      dateOfBirth,
      gender,
      parentName,
      parentPhone,
      parentEmail,
      address,
      class: studentClass,
      section,
      admissionDate
    } = req.body;

    // Check if student with email or roll number already exists
    const existingStudent = await Student.findOne({ 
      $or: [{ email }, { rollNumber }]
    });
    
    if (existingStudent) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: existingStudent.email === email 
          ? 'Student with this email already exists' 
          : 'Student with this roll number already exists'
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

    // Parse address if it's a string
    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch (error) {
        parsedAddress = {};
      }
    }

    // Generate temporary password
    const tempPassword = User.generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Generate username from roll number
    const username = `stu_${rollNumber.toLowerCase()}`;

    // Create User account
    const user = await User.create({
      name,
      email,
      username,
      phone: parentPhone,
      password: hashedPassword,
      role: 'student',
      studentId: rollNumber,
      classGrade: studentClass,
      isDemoAdmin: false,
      isActive: true,
      addedBy: req.user._id
    });

    // Create Student entry
    const student = await Student.create({
      name,
      email,
      rollNumber,
      dateOfBirth,
      gender,
      parentName,
      parentPhone,
      parentEmail,
      address: parsedAddress,
      class: studentClass,
      section,
      admissionDate,
      profilePhoto: req.file ? `/uploads/students/${req.file.filename}` : null,
      userId: user._id,
      createdBy: req.user._id
    });

    // Update user with student profile reference
    user.studentProfile = student._id;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        student,
        loginCredentials: {
          email: user.email,
          username: user.username,
          temporaryPassword: tempPassword,
          registrationLink: '/complete-registration', // Add this link
          temporaryAccessCode: tempPassword, // For verification if needed
          message: 'Student must complete registration to activate account'
        }
      },
      message: 'Student added successfully. Login credentials generated.'
    });

  } catch (error) {
    console.error('Add student error:', error);
    
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
        error: 'Email or roll number already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while adding student'
    });
  }
};

// Get all students
const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', class: studentClass } = req.query;

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { rollNumber: { $regex: search, $options: 'i' } },
          { parentName: { $regex: search, $options: 'i' } }
        ]
      };
    }

    if (studentClass) {
      searchQuery.class = studentClass;
    }

    const students = await Student.find(searchQuery)
      .populate('createdBy', 'name email')
      .populate('userId', 'username isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Student.countDocuments(searchQuery);

    res.json({
      success: true,
      data: students,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching students'
    });
  }
};

// Get single student
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('userId', 'username isActive lastLogin');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching student'
    });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Check if email is being changed
    if (req.body.email && req.body.email !== student.email) {
      const existingStudent = await Student.findOne({ email: req.body.email });
      if (existingStudent) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Student with this email already exists'
        });
      }

      // Update User email if it exists
      const user = await User.findById(student.userId);
      if (user) {
        user.email = req.body.email;
        user.username = req.body.email.split('@')[0];
        await user.save();
      }
    }

    // Check if roll number is being changed
    if (req.body.rollNumber && req.body.rollNumber !== student.rollNumber) {
      const existingStudent = await Student.findOne({ rollNumber: req.body.rollNumber });
      if (existingStudent) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Student with this roll number already exists'
        });
      }

      // Update User studentId if it exists
      const user = await User.findById(student.userId);
      if (user) {
        user.studentId = req.body.rollNumber;
        user.username = `stu_${req.body.rollNumber.toLowerCase()}`;
        await user.save();
      }
    }

    // Parse address if provided
    if (req.body.address) {
      let parsedAddress = req.body.address;
      if (typeof parsedAddress === 'string') {
        try {
          parsedAddress = JSON.parse(parsedAddress);
        } catch (error) {
          parsedAddress = {};
        }
      }
      req.body.address = parsedAddress;
    }

    // Handle profile photo update
    if (req.file) {
      if (student.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', student.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      req.body.profilePhoto = `/uploads/students/${req.file.filename}`;
    }

    // Update class grade in User model
    if (req.body.class) {
      const user = await User.findById(student.userId);
      if (user) {
        user.classGrade = req.body.class;
        await user.save();
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('userId', 'username isActive lastLogin');

    res.json({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    });

  } catch (error) {
    console.error('Update student error:', error);
    
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
      error: 'Server error while updating student'
    });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Delete associated User account
    await User.findByIdAndDelete(student.userId);

    // Delete profile photo if exists
    if (student.profilePhoto) {
      const photoPath = path.join(__dirname, '..', student.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Student and associated user account deleted successfully'
    });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting student'
    });
  }
};

module.exports = {
  addStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent
};