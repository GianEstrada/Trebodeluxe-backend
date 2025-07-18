const jwt = require('jsonwebtoken');

// Generar un token JWT para el usuario autenticado
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  if (!secret || secret === 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION') {
    console.warn('⚠️  ADVERTENCIA: Usando JWT_SECRET por defecto. Configura JWT_SECRET en variables de entorno para producción.');
  }
  
  return jwt.sign({ id }, secret, {
    expiresIn: expiresIn
  });
};

module.exports = { generateToken };
