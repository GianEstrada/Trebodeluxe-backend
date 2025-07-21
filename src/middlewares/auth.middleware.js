const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    // Verificar si el token está presente en los headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado'
      });
    }

    // Obtener el token del header
    const token = authHeader.split(' ')[1];

    try {
      // Verificar el token
      const secret = process.env.JWT_SECRET || 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION';
      const decoded = jwt.verify(token, secret);

      // Buscar el usuario en la base de datos
      const result = await db.query(
        'SELECT id_usuario, nombres, apellidos, correo, usuario, rol FROM usuarios WHERE id_usuario = $1',
        [decoded.id]
      );

      const user = result.rows[0];
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado - Usuario no encontrado'
        });
      }

      // Agregar el usuario a la request
      req.user = {
        id_usuario: user.id_usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        usuario: user.usuario,
        rol: user.rol
      };

      next();
    } catch (error) {
      console.error('Error al verificar token:', error);
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token inválido'
      });
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    // Verificar que el usuario tenga rol de admin (rol = 1)
    if (!req.user || req.user.rol !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Se requieren permisos de administrador'
      });
    }

    next();
  } catch (error) {
    console.error('Error en middleware requireAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  verifyToken,
  requireAdmin
};
