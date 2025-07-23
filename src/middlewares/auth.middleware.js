const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    console.log('🔍 [AUTH] Verificando token...');
    console.log('🔍 [AUTH] Headers recibidos:', {
      authorization: req.headers.authorization ? 'Bearer token presente' : 'No authorization header',
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
    });
    
    // Verificar si el token está presente en los headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔍 [AUTH] ERROR: Token no proporcionado o formato incorrecto');
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado'
      });
    }

    // Obtener el token del header
    const token = authHeader.split(' ')[1];
    console.log('🔍 [AUTH] Token extraído:', token ? `Token presente (${token.length} chars)` : 'No token');

    try {
      // Verificar el token
      const secret = process.env.JWT_SECRET || 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION';
      const decoded = jwt.verify(token, secret);
      console.log('🔍 [AUTH] Token decodificado:', {
        id: decoded.id,
        iat: decoded.iat,
        exp: decoded.exp
      });

      // Buscar el usuario en la base de datos
      const result = await db.query(
        'SELECT id_usuario, nombres, apellidos, correo, usuario, rol FROM usuarios WHERE id_usuario = $1',
        [decoded.id]
      );

      const user = result.rows[0];
      if (!user) {
        console.log('🔍 [AUTH] ERROR: Usuario no encontrado en BD para ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'No autorizado - Usuario no encontrado'
        });
      }

      console.log('🔍 [AUTH] Usuario encontrado:', {
        id: user.id_usuario,
        usuario: user.usuario,
        rol: user.rol
      });

      // Agregar el usuario a la request
      req.user = {
        id_usuario: user.id_usuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        usuario: user.usuario,
        rol: user.rol
      };

      console.log('🔍 [AUTH] Token verificado exitosamente');
      next();
    } catch (error) {
      console.error('🔍 [AUTH] Error al verificar token:', error.message);
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
    console.log('🔍 [ADMIN] Verificando permisos de admin...');
    console.log('🔍 [ADMIN] Usuario en request:', req.user ? {
      id: req.user.id_usuario,
      usuario: req.user.usuario,
      rol: req.user.rol
    } : 'No user in request');
    
    // Verificar que el usuario tenga rol de admin (rol = 'admin')
    if (!req.user || req.user.rol !== 'admin') {
      console.log('🔍 [ADMIN] ERROR: Acceso denegado. Rol requerido: admin, rol actual:', req.user?.rol || 'ninguno');
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado - Se requieren permisos de administrador'
      });
    }

    console.log('🔍 [ADMIN] Permisos de admin verificados exitosamente');
    next();
  } catch (error) {
    console.error('🔍 [ADMIN] Error en middleware requireAdmin:', error);
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
