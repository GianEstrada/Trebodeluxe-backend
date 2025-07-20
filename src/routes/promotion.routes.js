// routes/promotion.routes.js - Rutas para promociones

const express = require('express');
const router = express.Router();
const PromotionController = require('../controllers/promotion.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/active', PromotionController.getActivePromotions);
router.get('/validate/:codigo', PromotionController.validatePromotionCode);
router.get('/applicable/:productId/:categoria', PromotionController.getApplicablePromotions);

// Rutas protegidas (solo admin)
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

router.get('/', PromotionController.getAllPromotions);
router.post('/', PromotionController.createPromotion);
router.put('/:id', PromotionController.updatePromotion);
router.delete('/:id', PromotionController.deletePromotion);

module.exports = router;
