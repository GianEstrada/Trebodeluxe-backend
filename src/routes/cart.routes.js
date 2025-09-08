const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cart.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Middleware opcional que permite usuarios autenticados y no autenticados
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log('🔍 [OPTIONALAUTH] Verificando autenticación opcional...');
  console.log('🔍 [OPTIONALAUTH] Authorization header presente:', !!authHeader);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Hay token, intentar verificar
    try {
      console.log('🔍 [OPTIONALAUTH] Procesando token de autenticación...');
      
      // Intentar verificar el token manualmente
      const jwt = require('jsonwebtoken');
      const { pool } = require('../config/db');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'trebodeluxe_default_secret_key_CHANGE_IN_PRODUCTION');
      
      console.log('🔍 [OPTIONALAUTH] Token decodificado:', { id: decoded.id });
      
      // Buscar el usuario en la base de datos para obtener datos completos
      const result = await pool.query(
        'SELECT id_usuario, nombres, apellidos, correo, usuario, rol FROM usuarios WHERE id_usuario = $1',
        [decoded.id]
      );
      
      const user = result.rows[0];
      if (user) {
        req.user = {
          id_usuario: user.id_usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          correo: user.correo,
          usuario: user.usuario,
          rol: user.rol
        };
        console.log('✅ [OPTIONALAUTH] Usuario autenticado:', {
          id_usuario: user.id_usuario,
          usuario: user.usuario,
          rol: user.rol
        });
      } else {
        console.warn('⚠️ [OPTIONALAUTH] Usuario no encontrado en BD para ID:', decoded.id);
        req.user = null;
      }
    } catch (error) {
      // Si falla la verificación, continuar sin usuario
      console.log('⚠️ [OPTIONALAUTH] Token inválido, continuando sin usuario:', error.message);
      req.user = null;
    }
  } else {
    // Sin token, continuar sin usuario
    console.log('🔍 [OPTIONALAUTH] Sin token de autenticación, continuando como usuario anónimo');
    req.user = null;
  }
  next();
};

// RUTAS DEL CARRITO (SOPORTAN USUARIOS AUTENTICADOS Y NO AUTENTICADOS)

// GET /api/cart - Obtener carrito del usuario o de la sesión
router.get('/', optionalAuth, CartController.getCart);

// GET /api/cart/count - Obtener conteo rápido del carrito (para badges)
router.get('/count', optionalAuth, CartController.getCartCount);

// POST /api/cart/add - Agregar producto al carrito
router.post('/add', optionalAuth, CartController.addToCart);

// PUT /api/cart/update - Actualizar cantidad de un producto en el carrito
router.put('/update', optionalAuth, CartController.updateQuantity);

// DELETE /api/cart/remove - Eliminar producto del carrito
router.delete('/remove', optionalAuth, CartController.removeFromCart);

// DELETE /api/cart/clear - Limpiar todo el carrito
router.delete('/clear', optionalAuth, CartController.clearCart);

// POST /api/cart/migrate - Migrar carrito de sesión a usuario autenticado (requiere autenticación)
router.post('/migrate', verifyToken, CartController.migrateCart);

// POST /api/cart/migrate-to-session - Migrar carrito de usuario a token de sesión (para logout)
router.post('/migrate-to-session', verifyToken, CartController.migrateCartToSession);

module.exports = router;
