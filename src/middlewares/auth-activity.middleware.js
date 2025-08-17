const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Configuración de tiempo de expiración (15 minutos = 15 * 60 * 1000 ms)
const TOKEN_EXPIRY_TIME = 15 * 60 * 1000; // 15 minutos en millisegundos
const REFRESH_THRESHOLD = 5 * 60 * 1000;  // Renovar si faltan menos de 5 minutos

const generateTokenWithActivity = (id) => {
  const secret = process.env.JWT_SECRET || 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION';
  const now = Math.floor(Date.now() / 1000);
  
  return jwt.sign({ 
    id,
    iat: now,
    exp: now + (TOKEN_EXPIRY_TIME / 1000), // 15 minutos desde ahora
    lastActivity: now
  }, secret);
};

const verifyTokenWithActivity = async (req, res, next) => {
  try {
    console.log('🔍 [AUTH] Verificando token con actividad...');
    
    // Verificar si el token está presente
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔍 [AUTH] ERROR: Token no proporcionado');
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token no proporcionado',
        shouldRedirectToLogin: true
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION';
    
    try {
      const decoded = jwt.verify(token, secret);
      const now = Math.floor(Date.now() / 1000);
      
      // Verificar si el token ha expirado por inactividad
      const timeSinceLastActivity = now - (decoded.lastActivity || decoded.iat);
      const isExpiredByInactivity = timeSinceLastActivity > (TOKEN_EXPIRY_TIME / 1000);
      
      if (isExpiredByInactivity) {
        console.log('🔍 [AUTH] Token expirado por inactividad:', {
          timeSinceLastActivity: timeSinceLastActivity,
          maxInactivity: TOKEN_EXPIRY_TIME / 1000
        });
        return res.status(401).json({
          success: false,
          message: 'Sesión expirada por inactividad',
          shouldRedirectToLogin: true
        });
      }

      // Buscar el usuario en la base de datos
      const result = await db.query(
        'SELECT id_usuario, nombres, apellidos, correo, usuario, rol FROM usuarios WHERE id_usuario = $1',
        [decoded.id]
      );

      const user = result.rows[0];
      if (!user) {
        console.log('🔍 [AUTH] Usuario no encontrado');
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado',
          shouldRedirectToLogin: true
        });
      }

      // Verificar si necesita renovación (quedan menos de 5 minutos)
      const timeUntilExpiry = decoded.exp - now;
      const needsRefresh = timeUntilExpiry < (REFRESH_THRESHOLD / 1000);
      
      if (needsRefresh) {
        const newToken = generateTokenWithActivity(user.id_usuario);
        console.log('🔄 [AUTH] Token renovado automáticamente');
        
        // Enviar el nuevo token en los headers de respuesta
        res.set('X-New-Token', newToken);
        res.set('X-Token-Refreshed', 'true');
      }

      // Establecer usuario en el request
      req.user = user;
      console.log('🔍 [AUTH] Usuario autenticado:', {
        id: user.id_usuario,
        usuario: user.usuario,
        rol: user.rol
      });
      
      next();
    } catch (jwtError) {
      console.log('🔍 [AUTH] Error JWT:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          shouldRedirectToLogin: true
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        shouldRedirectToLogin: true
      });
    }
  } catch (error) {
    console.error('🔍 [AUTH] Error en verificación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const requireAdmin = (req, res, next) => {
  console.log('🔍 [ADMIN] Verificando permisos de admin...');
  console.log('🔍 [ADMIN] Usuario en request:', req.user);
  
  if (!req.user) {
    console.log('🔍 [ADMIN] ERROR: No hay usuario en request');
    return res.status(401).json({
      success: false,
      message: 'No autorizado - Usuario no autenticado',
      shouldRedirectToLogin: true
    });
  }

  if (req.user.rol !== 'admin') {
    console.log('🔍 [ADMIN] ERROR: Usuario no es admin, rol:', req.user.rol);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado - Se requieren permisos de administrador'
    });
  }

  console.log('🔍 [ADMIN] Permisos de admin verificados exitosamente');
  next();
};

module.exports = {
  verifyToken: verifyTokenWithActivity,
  requireAdmin,
  generateToken: generateTokenWithActivity
};
