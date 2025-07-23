// routes/cart.routes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// GET /api/cart - Obtener carrito activo
router.get('/', cartController.getActiveCart);

// POST /api/cart/add - Agregar producto al carrito
router.post('/add', cartController.addToCart);

// PUT /api/cart/update - Actualizar cantidad de un item
router.put('/update', cartController.updateCartItem);

// DELETE /api/cart/remove/:id_detalle - Eliminar item del carrito
router.delete('/remove/:id_detalle', cartController.removeFromCart);

// DELETE /api/cart/clear - Limpiar carrito
router.delete('/clear', cartController.clearCart);

module.exports = router;
