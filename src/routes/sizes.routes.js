const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const SizesController = require('../controllers/sizes.controller');

// Obtener todos los sistemas de tallas
router.get('/systems', SizesController.getAllSystems);
// Obtener todas las tallas
router.get('/', SizesController.getAllSizes);
// Crear sistema de tallas
router.post('/systems', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.createSystem);
// Crear talla
router.post('/', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.createSize);

module.exports = router;
