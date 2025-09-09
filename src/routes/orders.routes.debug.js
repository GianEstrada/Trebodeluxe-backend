// src/routes/orders.routes.js - Rutas para gestión de órdenes (VERSIÓN SIMPLIFICADA PARA DEBUG)
const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/orders.controller.simple');

console.log('🔍 [ORDERS ROUTES] Inicializando rutas de órdenes...');
console.log('🔍 [ORDERS ROUTES] ordersController:', typeof ordersController);
console.log('🔍 [ORDERS ROUTES] ordersController.createOrder:', typeof ordersController.createOrder);

// @route   POST /api/orders/create
// @desc    Crear nueva orden después del pago exitoso
// @access  Public (puede ser usuario anónimo)
router.post('/create', ordersController.createOrder);

// @route   GET /api/orders/:id
// @desc    Obtener orden por ID
// @access  Public (si se proporciona el número de referencia correcto)
router.get('/:id', ordersController.getOrderById);

// @route   GET /api/orders/reference/:reference
// @desc    Obtener orden por número de referencia
// @access  Public
router.get('/reference/:reference', ordersController.getOrderByReference);

// @route   GET /api/orders/payment-intent/:paymentIntentId
// @desc    Obtener orden por Payment Intent ID de Stripe
// @access  Public
router.get('/payment-intent/:paymentIntentId', ordersController.getOrderByPaymentIntent);

// RUTAS ADMINISTRATIVAS DESHABILITADAS TEMPORALMENTE PARA DEBUG
/*
// @route   PUT /api/orders/:id/status
// @desc    Actualizar estado de la orden
// @access  Private (Admin only)
router.put('/:id/status', authMiddleware.verifyToken, authMiddleware.requireAdmin, ordersController.updateOrderStatus);

// @route   POST /api/orders/:id/skydropx
// @desc    Crear orden en SkyDropX para una orden existente
// @access  Private (Admin only)
router.post('/:id/skydropx', authMiddleware.verifyToken, authMiddleware.requireAdmin, ordersController.createSkyDropXOrder);

// @route   GET /api/orders/user/:userId
// @desc    Obtener órdenes de un usuario específico
// @access  Private (Solo el usuario propietario o admin)
router.get('/user/:userId', authMiddleware.verifyToken, ordersController.getUserOrders);
*/

// @route   POST /api/orders/stripe/webhook
// @desc    Webhook de Stripe para confirmar pagos
// @access  Public (webhook)
router.post('/stripe/webhook', ordersController.handleStripeWebhook);

console.log('✅ [ORDERS ROUTES] Rutas de órdenes configuradas exitosamente');

module.exports = router;
