const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const stockPricingController = require('../controllers/stock-pricing.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');

// Importar rutas de categorías
const categoriasRoutes = require('./categorias.routes');

// Middleware para todas las rutas de admin
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

// Rutas de categorías
router.use('/categorias', categoriasRoutes);

// Rutas para variantes (legacy - mantenemos para compatibilidad)
router.get('/variants', adminController.getAllVariants);
router.post('/variants', adminController.createVariantForProduct);

// Rutas para variantes con nuevo sistema de precios en stock
router.get('/variants-v2', stockPricingController.getVariantsWithStockPricing);
router.post('/variants-v2', stockPricingController.createVariantWithStockPricing);
router.post('/variants-v2/new-product', stockPricingController.createProductWithVariantV2);
router.put('/variants-v2/:id_variante', stockPricingController.updateVariantWithStockPricing);

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

// Rutas para el sistema de imágenes index
router.get('/index-images', adminController.getIndexImages);
router.post('/index-images', adminController.createIndexImage);
router.put('/index-images/:id', adminController.updateIndexImage);
router.delete('/index-images/:id', adminController.deleteIndexImage);
router.put('/index-images/:id/status', adminController.updateImageStatus);

// Rutas de compatibilidad (redirects a imágenes index)
router.get('/principal-images', adminController.getIndexImages);
router.post('/principal-images', adminController.createIndexImage);
router.put('/principal-images/:id', adminController.updateIndexImage);
router.delete('/principal-images/:id', adminController.deleteIndexImage);
router.put('/principal-images/:id/position', adminController.updateImagePosition);

module.exports = router;
