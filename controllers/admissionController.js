// controller/admissionController.js
const Admission = require('../models/admissionModel');

// Create Admission - UPDATED WITH DEBUGGING
exports.createAdmission = async (req, res) => {
  try {
    console.log('🔵 CREATE ADMISSION REQUEST STARTED ==========');
    console.log('🔵 Request User:', req.user ? req.user._id : 'No user');
    console.log('🔵 Request Body:', JSON.stringify(req.body, null, 2));
    
    const {
      title,
      courseName,
      forClass,
      stream,
      academicYear,
      dates,
      fees,
      description,
      eligibility,
      seats
    } = req.body;

    // ========== VALIDATION SECTION ==========
    console.log('🔵 VALIDATING DATA...');
    
    // Basic validation
    const errors = [];
    if (!title) errors.push('Title is required');
    if (!courseName) errors.push('Course name is required');
    if (!forClass) errors.push('Class is required');
    if (!academicYear) errors.push('Academic year is required');
    if (!description) errors.push('Description is required');
    
    // Dates validation
    if (!dates || !dates.applicationStart || !dates.applicationEnd || 
        !dates.examDate || !dates.interviewDate || !dates.admissionStart) {
      errors.push('All dates are required');
    } else {
      // Check date formats
      const dateFields = ['applicationStart', 'applicationEnd', 'examDate', 'interviewDate', 'admissionStart'];
      dateFields.forEach(field => {
        if (isNaN(new Date(dates[field]))) {
          errors.push(`Invalid date format for ${field}: ${dates[field]}`);
        }
      });
    }
    
    // Fees validation
    if (!fees || fees.monthlyFee === undefined || fees.monthlyFee === null) {
      errors.push('Monthly fee is required');
    }
    
    if (errors.length > 0) {
      console.log('🔴 Validation errors:', errors);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }
    
    console.log('✅ Validation passed');
    
    // ========== DATA PROCESSING SECTION ==========
    console.log('🔵 PROCESSING DATA...');
    
    // Fix stream logic - Compare numbers properly
    const isSeniorClass = ['11', '12'].includes(forClass);
    const finalStream = isSeniorClass ? stream : null;
    
    console.log('🔵 Class:', forClass, 'isSeniorClass:', isSeniorClass, 'Stream:', finalStream);
    
    // Process dates to ensure they are Date objects
    const processedDates = {};
    if (dates) {
      Object.keys(dates).forEach(key => {
        if (dates[key]) {
          processedDates[key] = new Date(dates[key]);
          console.log(`🔵 Date ${key}:`, dates[key], '→', processedDates[key]);
        }
      });
    }
    
    // Process fees - convert strings to numbers
    const processedFees = {};
    if (fees) {
      Object.keys(fees).forEach(key => {
        const value = fees[key];
        processedFees[key] = value === '' || value === null || value === undefined ? 0 : Number(value);
        console.log(`🔵 Fee ${key}:`, value, '→', processedFees[key]);
      });
    }
    
    // Process eligibility
    const processedEligibility = {};
    if (eligibility) {
      Object.keys(eligibility).forEach(key => {
        const value = eligibility[key];
        if (key === 'otherRequirements') {
          processedEligibility[key] = value || '';
        } else {
          processedEligibility[key] = value === '' || value === null || value === undefined ? null : Number(value);
        }
        console.log(`🔵 Eligibility ${key}:`, value, '→', processedEligibility[key]);
      });
    }
    
    // Process seats
    const totalSeats = seats?.total ? Number(seats.total) : 50;
    const processedSeats = {
      total: totalSeats,
      available: totalSeats
    };
    console.log('🔵 Seats:', processedSeats);
    
    // ========== DATABASE OPERATION ==========
    console.log('🔵 CREATING ADMISSION IN DATABASE...');
    
    const admissionData = {
      title: title.trim(),
      courseName: courseName.trim(),
      forClass,
      stream: finalStream,
      academicYear,
      dates: processedDates,
      fees: processedFees,
      description: description.trim(),
      eligibility: processedEligibility,
      seats: processedSeats,
      createdBy: req.user._id,
      isActive: true,
      lastUpdated: new Date()
    };
    
    console.log('🔵 Final admission data:', JSON.stringify(admissionData, null, 2));
    
    const admission = await Admission.create(admissionData);
    
    console.log('✅ ADMISSION CREATED SUCCESSFULLY');
    console.log('✅ Admission ID:', admission._id);
    
    // Populate createdBy for response
    await admission.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      message: 'Admission course created successfully',
      data: admission
    });
    
  } catch (error) {
    console.error('🔴 CREATE ADMISSION ERROR:', error);
    console.error('🔴 Error name:', error.name);
    console.error('🔴 Error message:', error.message);
    console.error('🔴 Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed: ' + errors.join(', ')
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate admission found. Please check title and academic year.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// Get All Admissions - UPDATED WITH DEBUGGING
exports.getAllAdmissions = async (req, res) => {
  try {
    console.log('🔵 GET ALL ADMISSIONS REQUEST');
    console.log('🔵 Query params:', req.query);
    
    const { 
      academicYear, 
      forClass, 
      isActive = 'true',
      page = 1,
      limit = 10
    } = req.query;

    const query = {};
    
    if (academicYear) {
      query.academicYear = academicYear;
      console.log('🔵 Filter academicYear:', academicYear);
    }
    
    if (forClass) {
      query.forClass = forClass;
      console.log('🔵 Filter forClass:', forClass);
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
      console.log('🔵 Filter isActive:', isActive === 'true');
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    console.log('🔵 Pagination - page:', pageNum, 'limit:', limitNum, 'skip:', skip);
    console.log('🔵 Final query:', query);

    const [admissions, total] = await Promise.all([
      Admission.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Admission.countDocuments(query)
    ]);

    console.log('✅ Found', admissions.length, 'admissions out of', total, 'total');
    
    res.status(200).json({
      success: true,
      count: admissions.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: admissions
    });
  } catch (error) {
    console.error('🔴 GET ALL ADMISSIONS ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// Get Single Admission - UPDATED WITH DEBUGGING
exports.getAdmissionById = async (req, res) => {
  try {
    console.log('🔵 GET ADMISSION BY ID:', req.params.id);
    
    const admission = await Admission.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!admission) {
      console.log('🔴 Admission not found:', req.params.id);
      return res.status(404).json({
        success: false,
        error: 'Admission not found'
      });
    }

    console.log('✅ Admission found:', admission._id);
    
    res.status(200).json({
      success: true,
      data: admission
    });
  } catch (error) {
    console.error('🔴 GET ADMISSION BY ID ERROR:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid admission ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// Update Admission - UPDATED WITH DEBUGGING
exports.updateAdmission = async (req, res) => {
  try {
    console.log('🔵 UPDATE ADMISSION REQUEST:', req.params.id);
    console.log('🔵 Update data:', req.body);
    
    const admission = await Admission.findById(req.params.id);
    
    if (!admission) {
      console.log('🔴 Admission not found for update:', req.params.id);
      return res.status(404).json({
        success: false,
        error: 'Admission not found'
      });
    }

    console.log('🔵 Current admission:', admission.title);
    
    const { 
      title,
      dates,
      fees,
      description,
      seats,
      isActive 
    } = req.body;

    // Update fields with validation
    if (title !== undefined) {
      admission.title = title.trim();
      console.log('🔵 Updated title:', admission.title);
    }
    
    if (dates) {
      Object.keys(dates).forEach(key => {
        if (dates[key]) {
          admission.dates[key] = new Date(dates[key]);
          console.log(`🔵 Updated date ${key}:`, admission.dates[key]);
        }
      });
    }
    
    if (fees) {
      Object.keys(fees).forEach(key => {
        if (fees[key] !== undefined) {
          admission.fees[key] = Number(fees[key]) || 0;
          console.log(`🔵 Updated fee ${key}:`, admission.fees[key]);
        }
      });
    }
    
    if (description !== undefined) {
      admission.description = description.trim();
      console.log('🔵 Updated description length:', admission.description.length);
    }
    
    if (seats) {
      if (seats.total !== undefined) {
        admission.seats.total = Number(seats.total) || 50;
        console.log('🔵 Updated total seats:', admission.seats.total);
      }
      if (seats.available !== undefined) {
        admission.seats.available = Number(seats.available) || admission.seats.total;
        console.log('🔵 Updated available seats:', admission.seats.available);
      }
    }
    
    if (isActive !== undefined) {
      admission.isActive = isActive;
      console.log('🔵 Updated isActive:', admission.isActive);
    }
    
    admission.lastUpdated = new Date();
    console.log('🔵 Last updated:', admission.lastUpdated);
    
    await admission.save();
    
    console.log('✅ Admission updated successfully');
    
    res.status(200).json({
      success: true,
      message: 'Admission updated successfully',
      data: admission
    });
  } catch (error) {
    console.error('🔴 UPDATE ADMISSION ERROR:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed: ' + errors.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// Delete Admission - UPDATED WITH DEBUGGING
exports.deleteAdmission = async (req, res) => {
  try {
    console.log('🔵 DELETE ADMISSION REQUEST:', req.params.id);
    
    const admission = await Admission.findById(req.params.id);
    
    if (!admission) {
      console.log('🔴 Admission not found for deletion:', req.params.id);
      return res.status(404).json({
        success: false,
        error: 'Admission not found'
      });
    }

    console.log('🔵 Admission found:', admission.title);
    console.log('🔵 Current isActive:', admission.isActive);
    
    // Soft delete
    admission.isActive = false;
    admission.lastUpdated = new Date();
    
    await admission.save();
    
    console.log('✅ Admission soft deleted (isActive set to false)');
    
    res.status(200).json({
      success: true,
      message: 'Admission deleted successfully'
    });
  } catch (error) {
    console.error('🔴 DELETE ADMISSION ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
};

// Additional debug endpoint
exports.debugCreateAdmission = async (req, res) => {
  console.log('🔵 DEBUG ADMISSION REQUEST ==========');
  console.log('🔵 Headers:', req.headers);
  console.log('🔵 User:', req.user);
  console.log('🔵 Body:', req.body);
  console.log('🔵 Body raw:', JSON.stringify(req.body));
  
  res.status(200).json({
    success: true,
    message: 'Debug endpoint hit',
    data: {
      headers: req.headers,
      user: req.user,
      body: req.body
    }
  });
};