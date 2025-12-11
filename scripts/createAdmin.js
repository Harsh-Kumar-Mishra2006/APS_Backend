// scripts/createAdmin.js
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const Auth = require('../models/authModel');

const createInitialAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/schoolapp');
    
    // Check if admin already exists
    const existingAdmin = await Auth.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin account already exists');
      process.exit(0);
    }

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash('admin123', salt);
    
    const admin = await Auth.create({
      name: 'System Admin',
      email: 'admin@school.edu',
      username: 'admin',
      phone: '1234567890',
      password: hash,
      role: 'admin',
      isEmailApproved: true
    });

    console.log('✅ Admin account created successfully!');
    console.log('Email: admin@school.edu');
    console.log('Password: admin123');
    console.log('Please change the password after first login.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createInitialAdmin();