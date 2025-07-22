const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../controllers/admin.controller');

// Configurar multer para subida de archivos
const upload = multer({ dest: 'uploads/' });

// Rutas para variantes
router.get('/variants', adminController.getAllVariants);
router.get('/products', adminController.getAllProducts);
router.get('/size-systems', adminController.getSizeSystems);

// Rutas para crear productos y variantes
router.post('/products', adminController.createProductWithVariant);
router.post('/variants', adminController.createVariantForProduct);

// Ruta para subir imágenes
router.post('/upload-image', upload.single('image'), adminController.uploadImageToCloudinary);

module.exports = router;
