const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const SizesController = require('../controllers/sizes.controller');

console.log('🚀 INICIANDO CONFIGURACIÓN DE RUTAS SIZES...');

try {
  // Obtener todos los sistemas de tallas
  router.get('/systems', (req, res, next) => {
    console.log('📡 Ruta /api/sizes/systems llamada');
    SizesController.getAllSystems(req, res, next);
  });
  console.log('✅ Ruta GET /systems configurada');

  // Obtener todas las tallas
  router.get('/', (req, res, next) => {
    console.log('📡 Ruta /api/sizes/ llamada');
    SizesController.getAllSizes(req, res, next);
  });
  console.log('✅ Ruta GET / configurada');

  // Crear sistema de tallas
  router.post('/systems', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.createSystem);
  console.log('✅ Ruta POST /systems configurada');
  
  // Crear talla
  router.post('/', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.createSize);
  console.log('✅ Ruta POST / configurada');

  console.log('🎉 TODAS LAS RUTAS DE SIZES CONFIGURADAS CORRECTAMENTE');
} catch (error) {
  console.error('❌ ERROR AL CONFIGURAR RUTAS SIZES:', error);
}

module.exports = router;
