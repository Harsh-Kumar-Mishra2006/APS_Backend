// config/jwtConfig.js
module.exports = {
  secret: process.env.JWT_SECRET || 'Harsh2006@',
  expiresIn: '7d', // Consistent expiry
  algorithm: 'HS256'
};