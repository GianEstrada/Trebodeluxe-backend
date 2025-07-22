// routes/size-system.routes.js - Rutas para CRUD de sistemas de tallas

const express = require('express');
const router = express.Router();
const SizeSystemController = require('../controllers/size-system.controller');

console.log('🚀 INICIANDO CONFIGURACIÓN DE RUTAS SIZE SYSTEMS...');

// GET /api/size-systems - Obtener todos los sistemas de tallas
router.get('/', SizeSystemController.getAllSizeSystems);
console.log('✅ Ruta GET / configurada');

// GET /api/size-systems/search - Buscar sistemas de tallas
router.get('/search', SizeSystemController.searchSizeSystems);
console.log('✅ Ruta GET /search configurada');

// POST /api/size-systems - Crear nuevo sistema de tallas
router.post('/', SizeSystemController.createSizeSystem);
console.log('✅ Ruta POST / configurada');

// PUT /api/size-systems/:id - Actualizar sistema de tallas
router.put('/:id', SizeSystemController.updateSizeSystem);
console.log('✅ Ruta PUT /:id configurada');

// DELETE /api/size-systems/:id - Eliminar sistema de tallas
router.delete('/:id', SizeSystemController.deleteSizeSystem);
console.log('✅ Ruta DELETE /:id configurada');

console.log('🎉 TODAS LAS RUTAS DE SIZE SYSTEMS CONFIGURADAS CORRECTAMENTE');

module.exports = router;
