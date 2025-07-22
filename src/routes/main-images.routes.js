// main-images.routes.js - Rutas para gestionar las imágenes principales del sitio

const express = require('express');
const router = express.Router();
const MainImagesController = require('../controllers/main-images.controller');

// Rutas públicas (sin autenticación)
// GET /api/main-images - Obtener todas las imágenes principales
router.get('/', MainImagesController.getAllImages);

// GET /api/main-images/type/:tipo - Obtener imágenes por tipo específico
router.get('/type/:tipo', MainImagesController.getImagesByType);

// Rutas administrativas (requieren autenticación - agregar middleware más adelante)
// POST /api/main-images - Crear nueva imagen
router.post('/', MainImagesController.createImage);

// PUT /api/main-images/:id - Actualizar imagen existente
router.put('/:id', MainImagesController.updateImage);

// DELETE /api/main-images/:id - Eliminar imagen (soft delete)
router.delete('/:id', MainImagesController.deleteImage);

// PUT /api/main-images/reorder/:tipo - Reordenar imágenes de un tipo
router.put('/reorder/:tipo', MainImagesController.reorderImages);

module.exports = router;
