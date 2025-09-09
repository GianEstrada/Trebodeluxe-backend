// src/routes/orders.routes.js - Rutas para gestión de órdenes
const express = require('express');
const router = express.Router();

// Import with error handling for deployment safety
let OrdersController;
try {
  OrdersController = require('../controllers/orders.controller');
  console.log('✅ OrdersController loaded successfully');
} catch (error) {
  console.error('❌ Error loading OrdersController:', error.message);
  throw new Error('Failed to load OrdersController');
}

const authMiddleware = require('../middlewares/auth.middleware');

// Verify all required methods exist
const requiredMethods = ['createOrder', 'getOrderById', 'getOrderByReference', 'getOrderByPaymentIntent', 'updateOrderStatus', 'createSkyDropXOrder', 'getUserOrders', 'handleStripeWebhook'];
for (const method of requiredMethods) {
  if (typeof OrdersController[method] !== 'function') {
    console.error(`❌ Missing method: OrdersController.${method}`);
    throw new Error(`OrdersController.${method} is not a function`);
  }
}
console.log('✅ All OrdersController methods verified');

// @route   POST /api/orders/create
// @desc    Crear nueva orden después del pago exitoso
// @access  Public (puede ser usuario anónimo)
router.post('/create', OrdersController.createOrder);

// @route   GET /api/orders/:id
// @desc    Obtener orden por ID
// @access  Public (si se proporciona el número de referencia correcto)
router.get('/:id', OrdersController.getOrderById);

// @route   GET /api/orders/reference/:reference
// @desc    Obtener orden por número de referencia
// @access  Public
router.get('/reference/:reference', OrdersController.getOrderByReference);

// @route   GET /api/orders/payment-intent/:paymentIntentId
// @desc    Obtener orden por Payment Intent ID de Stripe
// @access  Public
router.get('/payment-intent/:paymentIntentId', OrdersController.getOrderByPaymentIntent);

// @route   PUT /api/orders/:id/status
// @desc    Actualizar estado de la orden
// @access  Private (Admin only)
router.put('/:id/status', authMiddleware.verifyToken, authMiddleware.requireAdmin, OrdersController.updateOrderStatus);

// @route   POST /api/orders/:id/skydropx
// @desc    Crear orden en SkyDropX para una orden existente
// @access  Private (Admin only)
router.post('/:id/skydropx', authMiddleware.verifyToken, authMiddleware.requireAdmin, OrdersController.createSkyDropXOrder);

// @route   GET /api/orders/user/:userId
// @desc    Obtener órdenes de un usuario específico
// @access  Private (Solo el usuario propietario o admin)
router.get('/user/:userId', authMiddleware.verifyToken, OrdersController.getUserOrders);

// @route   POST /api/orders/stripe/webhook
// @desc    Webhook de Stripe para confirmar pagos
// @access  Public (webhook)
router.post('/stripe/webhook', OrdersController.handleStripeWebhook);

module.exports = router;
