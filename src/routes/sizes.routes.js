const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const SizesController = require('../controllers/sizes.controller');

console.log('Configurando rutas de sizes...');

// Obtener todos los sistemas de tallas
router.get('/systems', (req, res, next) => {
  console.log('Ruta /api/sizes/systems llamada');
  SizesController.getAllSystems(req, res, next);
});

// Obtener todas las tallas
router.get('/', (req, res, next) => {
  console.log('Ruta /api/sizes/ llamada');
  SizesController.getAllSizes(req, res, next);
});

// Crear sistema de tallas
router.post('/systems', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.createSystem);
// Crear talla
router.post('/', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.createSize);

console.log('Rutas de sizes configuradas correctamente');
module.exports = router;
