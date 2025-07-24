const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Rutas públicas para imágenes index (sin autenticación requerida)
// GET /api/public/index-images - Obtener todas las imágenes index
router.get('/', adminController.getIndexImages);

// GET /api/public/index-images/banner - Obtener imágenes de banner activas
router.get('/banner', (req, res) => {
  req.query.seccion = 'banner';
  return adminController.getIndexImages(req, res);
});

// GET /api/public/index-images/principal - Obtener imágenes principales activas
router.get('/principal', (req, res) => {
  req.query.seccion = 'principal';
  return adminController.getIndexImages(req, res);
});

module.exports = router;
