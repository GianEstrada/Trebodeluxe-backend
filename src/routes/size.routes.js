// routes/size.routes.js - Rutas para sistemas de tallas y stock

const express = require('express');
const router = express.Router();
const SizeController = require('../controllers/size.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/systems', SizeController.getAllSystems);
router.get('/systems/:id', SizeController.getSystemById);
router.get('/systems/:systemId/sizes', SizeController.getSizesBySystem);
router.get('/stock/:productId/:variantId', SizeController.getStockByProductVariant);

// Rutas protegidas (solo admin)
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

// Gestión de sistemas de tallas
router.post('/systems', SizeController.createSystem);
router.put('/systems/:id', SizeController.updateSystem);
router.delete('/systems/:id', SizeController.deleteSystem);

// Gestión de tallas
router.post('/sizes', SizeController.createSize);
router.put('/sizes/:id', SizeController.updateSize);
router.delete('/sizes/:id', SizeController.deleteSize);

// Gestión de stock
router.get('/stock', SizeController.getAllStock);
router.put('/stock', SizeController.updateStock);

module.exports = router;
