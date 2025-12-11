const Admission = require('../models/admissionModel');

const generateAdmissionId = async (academicYear, admissionFor) => {
  try {
    // Extract last two digits of academic year (e.g., 26 from 2026-27)
    const yearCode = academicYear.substring(2, 4);
    
    // Class code mapping
    const classCodes = {
      'Nursery': 'NUR',
      'LKG': 'LKG',
      'UKG': 'UKG',
      '1': '01',
      '2': '02',
      '3': '03',
      '4': '04',
      '5': '05',
      '6': '06',
      '7': '07',
      '8': '08',
      '9': '09',
      '10': '10',
      '11': '11',
      '12': '12'
    };

    const classCode = classCodes[admissionFor] || '00';

    // Get count of admissions for this academic year and class
    const count = await Admission.countDocuments({
      academicYear,
      admissionFor
    });

    const serial = (count + 1).toString().padStart(4, '0');
    
    return `ADM${yearCode}${classCode}${serial}`;
  } catch (error) {
    console.error('Generate admission ID error:', error);
    throw error;
  }
};

module.exports = generateAdmissionId;