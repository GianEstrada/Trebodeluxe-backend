const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cart.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Middleware opcional que permite usuarios autenticados y no autenticados
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Hay token, intentar verificar
    try {
      // Intentar verificar el token manualmente
      const jwt = require('jsonwebtoken');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Si falla la verificación, continuar sin usuario
      console.log('Token inválido, continuando sin usuario:', error.message);
      req.user = null;
    }
  } else {
    // Sin token, continuar sin usuario
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

module.exports = router;
