const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const SizesController = require('../controllers/sizes.controller');

console.log('🚀 INICIANDO CONFIGURACIÓN DE RUTAS SIZES...');

try {
  // Ruta de prueba simple
  router.get('/test', (req, res) => {
    console.log('📡 Ruta de prueba /api/sizes/test llamada');
    res.json({ 
      success: true, 
      message: 'Sizes routes funcionando correctamente',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ Ruta GET /test configurada');

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

  // Eliminar una talla por ID
  router.delete('/:id', authMiddleware.verifyToken, authMiddleware.requireAdmin, SizesController.deleteSize);
  console.log('✅ Ruta DELETE /:id configurada');

  console.log('🎉 TODAS LAS RUTAS DE SIZES CONFIGURADAS CORRECTAMENTE');
} catch (error) {
  console.error('❌ ERROR AL CONFIGURAR RUTAS SIZES:', error);
}

module.exports = router;
