const jwt = require('jsonwebtoken');

// Generar un token JWT para el usuario autenticado
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

module.exports = { generateToken };
