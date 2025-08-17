// promotions-admin.routes.js - Rutas administrativas para gestionar promociones

const express = require('express');
const router = express.Router();
const PromotionsController = require('../controllers/promotions-admin.controller');

// ===== RUTAS ADMINISTRATIVAS =====
// GET /api/admin/promotions - Obtener todas las promociones con paginación y filtros
router.get('/', PromotionsController.getAllPromotions);

// GET /api/admin/promotions/products/dropdown - Obtener productos para dropdown
router.get('/products/dropdown', PromotionsController.getProductsForDropdown);

// GET /api/admin/promotions/:id - Obtener promoción específica por ID
router.get('/:id', PromotionsController.getPromotionById);

// POST /api/admin/promotions - Crear nueva promoción
router.post('/', PromotionsController.createPromotion);

// PUT /api/admin/promotions/:id - Actualizar promoción existente
router.put('/:id', PromotionsController.updatePromotion);

// DELETE /api/admin/promotions/:id - Eliminar promoción (soft delete)
router.delete('/:id', PromotionsController.deletePromotion);

// ===== RUTAS PÚBLICAS =====
// GET /api/admin/promotions/public/active - Obtener promociones activas para frontend
router.get('/public/active', PromotionsController.getActivePromotions);

// POST /api/admin/promotions/:id/apply - Aplicar promoción (incrementar uso)
router.post('/:id/apply', PromotionsController.applyPromotion);

module.exports = router;
