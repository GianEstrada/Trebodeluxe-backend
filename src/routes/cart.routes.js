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

// GET /api/cart - Obtener carrito activo (con autenticación opcional)
router.get('/', optionalAuth, cartController.getActiveCart);

// Las demás rutas siguen requiriendo autenticación
router.use(verifyToken);

// POST /api/cart/add - Agregar producto al carrito
router.post('/add', cartController.addToCart);

// PUT /api/cart/update - Actualizar cantidad de un item
router.put('/update', cartController.updateCartItem);

// DELETE /api/cart/remove/:id_detalle - Eliminar item del carrito
router.delete('/remove/:id_detalle', cartController.removeFromCart);

// DELETE /api/cart/clear - Limpiar carrito
router.delete('/clear', cartController.clearCart);

module.exports = router;
