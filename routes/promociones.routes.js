const express = require('express');
const router = express.Router();
const promocionesController = require('../controllers/promociones.controller');

// Ruta para obtener promociones de un producto específico
router.get('/producto/:productId', promocionesController.getPromotionsForProduct);

// Ruta para obtener todas las promociones activas
router.get('/activas', promocionesController.getActivePromotions);

// Ruta para obtener promociones por categoría
router.get('/categoria/:categoryId', promocionesController.getPromotionsByCategory);

module.exports = router;
