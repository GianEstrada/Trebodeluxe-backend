// orders-admin.routes.js - Rutas para gestión administrativa de pedidos

const express = require('express');
const OrdersAdminController = require('../controllers/orders-admin.controller');

const router = express.Router();

// ===== RUTAS DE PEDIDOS ADMIN =====

// GET /api/admin/orders - Obtener todos los pedidos con filtros y búsqueda
router.get('/', OrdersAdminController.getAllOrders);

// GET /api/admin/orders/stats - Obtener estadísticas de pedidos
router.get('/stats', OrdersAdminController.getOrdersStats);

// GET /api/admin/orders/:id - Obtener pedido específico por ID
router.get('/:id', OrdersAdminController.getOrderById);

// PUT /api/admin/orders/:id - Actualizar estado y/o notas del pedido
router.put('/:id', OrdersAdminController.updateOrder);

module.exports = router;
