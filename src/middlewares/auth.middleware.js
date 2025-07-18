const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
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
        'SELECT id_usuario, nombres, apellidos, correo, usuario FROM usuarios WHERE id_usuario = $1',
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
        usuario: user.usuario
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

module.exports = authMiddleware;
