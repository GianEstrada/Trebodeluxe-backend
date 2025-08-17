// routes/cart.routes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Middleware opcional que permite usuarios autenticados y no autenticados
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Hay token, intentar verificar
    verifyToken(req, res, next);
  } else {
    // Sin token, continuar sin usuario
    req.user = null;
    next();
  }
};

// TODAS LAS RUTAS DEL CARRITO SON PÚBLICAS (SOPORTAN USUARIOS INVITADOS)

// GET /api/cart - Obtener carrito activo (con autenticación opcional)
router.get('/', optionalAuth, cartController.getActiveCart);

// POST /api/cart/guest - Crear/obtener carrito para invitado
router.post('/guest', cartController.createGuestCart);

// POST /api/cart/add - Añadir producto al carrito
router.post('/add', optionalAuth, cartController.addToCart);

// PUT /api/cart/update/:id - Actualizar cantidad de producto en carrito
router.put('/update/:id', optionalAuth, cartController.updateCartItem);

// DELETE /api/cart/remove/:id - Remover producto del carrito
router.delete('/remove/:id', optionalAuth, cartController.removeFromCart);

// DELETE /api/cart/clear - Limpiar carrito completamente
router.delete('/clear', optionalAuth, cartController.clearCart);

module.exports = router;
