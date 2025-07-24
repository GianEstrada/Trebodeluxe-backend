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

// Rutas para editar y eliminar productos
router.get('/products/:id', adminController.getProductById);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Rutas para editar y eliminar variantes
router.get('/variants/:id', adminController.getVariantById);
router.put('/variants/:id', adminController.updateVariant);
router.delete('/variants/:id', adminController.deleteVariant);

// Ruta para crear variantes en productos existentes
router.post('/products/variants', adminController.createVariantForProduct);

// Ruta para subir imágenes
router.post('/upload-image', 
  upload.single('image'), 
  handleMulterError,
  adminController.uploadImageToCloudinary
);

// Ruta para eliminar imágenes
router.delete('/delete-image', adminController.deleteImageFromCloudinary);

// Rutas para imágenes principales del sitio (legacy)
router.get('/home-images', adminController.getHomeImages);
router.put('/home-images', adminController.updateHomeImage);

// Rutas para el nuevo sistema de imágenes principales
router.get('/principal-images', adminController.getPrincipalImages);
router.post('/principal-images', adminController.createPrincipalImage);
router.put('/principal-images/:id', adminController.updatePrincipalImage);
router.delete('/principal-images/:id', adminController.deletePrincipalImage);
router.put('/principal-images/:id/position', adminController.updateImagePosition);

module.exports = router;
