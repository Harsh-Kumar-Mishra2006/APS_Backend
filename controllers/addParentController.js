const Parent = require('../models/addParentModel');
const Student = require('../models/addStudentModel');
const User = require('../models/authModel');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Add new parent
// controllers/addParentController.js
const addParent = async (req, res) => {
  try {
    console.log('=== PARENT ADD REQUEST START ===');
    console.log('Request Body:', req.body);
    
    const {
      studentName,
      studentEmail,
      parentName,
      parentEmail,
      parentPhone,
      relationship,
      address,
      occupation,
      emergencyContact,
      // Make these optional
      rollNumber,
      dateOfBirth,
      gender,
      class: studentClass,
      section,
      admissionDate
    } = req.body;

    // Validate only parent fields (student fields are optional)
    if (!parentName || !parentEmail || !parentPhone) {
      return res.status(400).json({
        success: false,
        error: 'Parent name, email, and phone are required'
      });
    }

    // Check if parent with email already exists
    const existingParent = await Parent.findOne({ parentEmail });
    if (existingParent) {
      return res.status(400).json({
        success: false,
        error: 'Parent with this email already exists'
      });
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: parentEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // If studentEmail is provided, try to find the student
    let student = null;
    let parentOf = [];
    
    if (studentEmail) {
      student = await Student.findOne({ email: studentEmail });
      if (student) {
        parentOf = [student._id];
        console.log(`✅ Found existing student: ${student.name}`);
      } else {
        console.log(`⚠️ Student with email ${studentEmail} not found. Parent will be added without student link.`);
      }
    }

    // Parse address and emergency contact
    let parsedAddress = {};
    let parsedEmergencyContact = {};
    
    if (address) {
      try {
        parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
      } catch (e) {
        parsedAddress = address || {};
      }
    }
    
    if (emergencyContact) {
      try {
        parsedEmergencyContact = typeof emergencyContact === 'string' ? JSON.parse(emergencyContact) : emergencyContact;
      } catch (e) {
        parsedEmergencyContact = emergencyContact || {};
      }
    }

    // Generate temporary password
    const tempPassword = User.generateTemporaryPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Generate username from email
    const username = parentEmail.split('@')[0];

    // Create User account
    const user = await User.create({
      name: parentName,
      email: parentEmail,
      username,
      phone: parentPhone,
      password: hashedPassword,
      role: 'parent',
      parentOf: parentOf, // Empty array if no student found
      isDemoAdmin: false,
      isActive: true,
      addedBy: req.user._id
    });

    // Create Parent entry
    const parent = await Parent.create({
      // Student fields (optional)
      studentName: studentName || null,
      studentEmail: studentEmail || null,
      studentRollNumber: rollNumber || null,
      
      // Parent fields (required)
      parentName,
      parentEmail,
      parentPhone,
      relationship: relationship || 'Parent',
      address: parsedAddress,
      occupation: occupation || '',
      emergencyContact: parsedEmergencyContact,
      profilePhoto: req.file ? `/uploads/parents/${req.file.filename}` : null,
      userId: user._id,
      createdBy: req.user._id,
      
      // Link to student if found
      linkedStudentId: student ? student._id : null,
      isLinkedToStudent: !!student
    });

    // Update user with parent profile reference
    user.parentProfile = parent._id;
    await user.save();

    // If student exists and we want to update it with parent info (optional)
    if (student) {
      // Option 1: Just link, don't update student data
      // student.parentEmail = parentEmail; // Already in student model
      // student.parentPhone = parentPhone; // Already in student model
      // await student.save();
      
      // Option 2: Just mark that parent is linked
      console.log(`✅ Parent linked to student: ${student.name}`);
    }

    res.status(201).json({
      success: true,
      data: {
        parent,
        loginCredentials: {
          email: user.email,
          username: user.username,
          temporaryPassword: tempPassword,
          registrationLink: '/complete-registration', // Add this link
          temporaryAccessCode: tempPassword, // For verification if needed
          message: 'Parents must complete registration to activate account'
        },
        studentLinked: !!student,
        studentInfo: student ? {
          name: student.name,
          email: student.email,
          class: student.class
        } : null
      },
      message: student 
        ? 'Parent added and linked to existing student successfully.' 
        : 'Parent added successfully. Student not linked (email not found).'
    });

  } catch (error) {
    console.error('Add parent error:', error);
    
    // Cleanup uploaded file if error
    if (req.file && req.file.path) {
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
        error: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error while adding parent'
    });
  }
};

// Get all parents
const getParents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    // Build search query
    const searchQuery = search ? {
      $or: [
        { studentName: { $regex: search, $options: 'i' } },
        { parentName: { $regex: search, $options: 'i' } },
        { parentEmail: { $regex: search, $options: 'i' } },
        { studentEmail: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const parents = await Parent.find(searchQuery)
      .populate('createdBy', 'name email')
      .populate('userId', 'username isActive lastLogin')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Parent.countDocuments(searchQuery);

    res.json({
      success: true,
      data: parents,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get parents error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching parents'
    });
  }
};

// Get single parent
const getParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('userId', 'username isActive lastLogin');

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    res.json({
      success: true,
      data: parent
    });

  } catch (error) {
    console.error('Get parent error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching parent'
    });
  }
};

// Update parent
const updateParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);

    if (!parent) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (req.body.parentEmail && req.body.parentEmail !== parent.parentEmail) {
      const existingParent = await Parent.findOne({ parentEmail: req.body.parentEmail });
      if (existingParent) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Parent with this email already exists'
        });
      }

      // Update User email if it exists
      const user = await User.findById(parent.userId);
      if (user) {
        user.email = req.body.parentEmail;
        user.username = req.body.parentEmail.split('@')[0];
        await user.save();
      }
    }

    // Parse address and emergency contact if provided
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

    if (req.body.emergencyContact) {
      let parsedEmergencyContact = req.body.emergencyContact;
      if (typeof parsedEmergencyContact === 'string') {
        try {
          parsedEmergencyContact = JSON.parse(parsedEmergencyContact);
        } catch (error) {
          parsedEmergencyContact = {};
        }
      }
      req.body.emergencyContact = parsedEmergencyContact;
    }

    // Handle profile photo update
    if (req.file) {
      if (parent.profilePhoto) {
        const oldPhotoPath = path.join(__dirname, '..', parent.profilePhoto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      req.body.profilePhoto = `/uploads/parents/${req.file.filename}`;
    }

    const updatedParent = await Parent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'name email')
    .populate('userId', 'username isActive lastLogin');

    res.json({
      success: true,
      data: updatedParent,
      message: 'Parent updated successfully'
    });

  } catch (error) {
    console.error('Update parent error:', error);
    
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
      error: 'Server error while updating parent'
    });
  }
};

// Delete parent
const deleteParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    // Delete associated User account
    await User.findByIdAndDelete(parent.userId);

    // Delete profile photo if exists
    if (parent.profilePhoto) {
      const photoPath = path.join(__dirname, '..', parent.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await Parent.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Parent and associated user account deleted successfully'
    });

  } catch (error) {
    console.error('Delete parent error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while deleting parent'
    });
  }
};

// Add to parentController.js
const searchStudents = async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 2 characters to search'
      });
    }

    const students = await Student.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ],
      isActive: true
    })
    .select('name email rollNumber class section dateOfBirth gender parentName parentEmail parentPhone')
    .limit(10);

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while searching students'
    });
  }
};


module.exports = {
  addParent,
  getParents,
  getParent,
  updateParent,
  deleteParent,
  searchStudents
};