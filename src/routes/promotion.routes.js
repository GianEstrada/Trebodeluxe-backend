// routes/promotion.routes.js - Rutas para promociones

const express = require('express');
const router = express.Router();
const PromotionController = require('../controllers/promotion.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/active', PromotionController.getActivePromotions);
router.get('/homepage', PromotionController.getHomepagePromotions);
router.get('/category/:categoria', PromotionController.getPromotionsByCategory);
router.get('/:id_promocion/products', PromotionController.getPromotionProducts);
router.get('/validate/:codigo', PromotionController.validatePromotionCode);
router.get('/applicable/:productId/:categoria', PromotionController.getApplicablePromotions);
router.get('/product/:productId', PromotionController.getPromotionsForProduct); // Nueva ruta
router.get('/producto/:productId', PromotionController.getPromotionsForProduct); // Alias para compatibilidad con frontend
router.get('/debug/all', PromotionController.debugAllPromotions); // Debug ruta
router.get('/debug/admin', PromotionController.debugAdminResponse); // Debug admin sin auth
router.post('/debug/repair-ea', PromotionController.repairPromocionEa); // Repair promocion "ea"

// Rutas protegidas (solo admin)
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

router.get('/', PromotionController.getAllPromotions);
router.post('/', PromotionController.createPromotion);
router.put('/:id', PromotionController.updatePromotion);
router.delete('/:id', PromotionController.deletePromotion);

module.exports = router;
