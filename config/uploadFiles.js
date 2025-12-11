// config/uploadFiles.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory with subdirectories
const createUploadDirs = () => {
  const dirs = [
    'uploads/attendance',
    'uploads/attendance/monthly',
    'uploads/exam-results',
    'uploads/student-documents'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure storage for attendance files
const attendanceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { forMonth } = req.body;
    if (forMonth) {
      const monthDir = `uploads/attendance/monthly/${forMonth}`;
      if (!fs.existsSync(monthDir)) {
        fs.mkdirSync(monthDir, { recursive: true });
      }
      cb(null, monthDir);
    } else {
      cb(null, 'uploads/attendance');
    }
  },
  filename: function (req, file, cb) {
    const { studentEmail, forMonth } = req.body;
    const timestamp = Date.now();
    const uniqueSuffix = studentEmail 
      ? `${studentEmail.split('@')[0]}-${forMonth || 'attendance'}-${timestamp}`
      : `attendance-${timestamp}`;
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Excel, CSV, Word, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: attendanceStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

module.exports = { upload, createUploadDirs };