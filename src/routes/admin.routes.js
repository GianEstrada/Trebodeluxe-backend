const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');

// Middleware para todas las rutas de admin
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

// Rutas para variantes
router.get('/variants', adminController.getAllVariants);
router.get('/products', adminController.getAllProducts);
router.get('/size-systems', adminController.getSizeSystems);

// Rutas para crear productos y variantes
router.post('/products', adminController.createProductWithVariant);
router.post('/variants', adminController.createVariantForProduct);

// Ruta para subir imágenes
router.post('/upload-image', 
  upload.single('image'), 
  handleMulterError,
  adminController.uploadImageToCloudinary
);

module.exports = router;
