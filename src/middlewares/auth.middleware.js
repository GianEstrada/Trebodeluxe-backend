const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware para proteger rutas que requieren autenticación
const protect = async (req, res, next) => {
  let token;

  // Verificar si el token está presente en los headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener el token del header
      token = req.headers.authorization.split(' ')[1];

      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Obtener los datos del usuario sin la contraseña
      const result = await db.query(
        'SELECT id_usuario, nombres, apellidos, correo FROM usuarios WHERE id_usuario = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        res.status(401);
        throw new Error('Token no válido - usuario no encontrado');
      }

      // Agregar el usuario a la request
      req.user = result.rows[0];
      next();
    } catch (error) {
      console.error('Error de autenticación:', error);
      res.status(401);
      throw new Error('No autorizado, token fallido');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('No autorizado, no hay token');
  }
};

module.exports = { protect };
