const express = require('express');
const router = express.Router();
const AdminProductController = require('../controllers/admin.product.controller');
const AdminVariantController = require('../controllers/admin.variant.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');

// Middleware para todas las rutas de admin
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

// === RUTAS PRINCIPALES ===

// @route   GET /api/admin/products
// @desc    Obtener productos para admin con filtros y búsqueda
// @query   search, categoria, marca, activo, limit, offset, sortBy, sortOrder
// @access  Private (Admin only)
router.get('/', AdminProductController.getProducts);

// @route   GET /api/admin/products/stats
// @desc    Obtener estadísticas del admin
// @access  Private (Admin only)
router.get('/stats', AdminProductController.getStats);

// @route   GET /api/admin/products/form-data
// @desc    Obtener datos para formularios (categorías, marcas, sistemas de talla)
// @access  Private (Admin only)
router.get('/form-data', AdminProductController.getFormData);

// @route   GET /api/admin/products/:id
// @desc    Obtener producto completo para edición
// @access  Private (Admin only)
router.get('/:id', AdminProductController.getProductForEdit);

// @route   POST /api/admin/products
// @desc    Crear nuevo producto con variante e imagen opcional
// @access  Private (Admin only)
router.post('/',
  upload.single('imagen'),
  handleMulterError,
  AdminProductController.createProduct
);

// @route   PUT /api/admin/products/:id
// @desc    Actualizar producto
// @access  Private (Admin only)
router.put('/:id', AdminProductController.updateProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Eliminar producto (incluyendo imágenes de Cloudinary)
// @access  Private (Admin only)
router.delete('/:id', AdminProductController.deleteProduct);

// === RUTAS PARA IMÁGENES ===

// @route   POST /api/admin/products/variant/:id_variante/image
// @desc    Subir imagen a una variante específica
// @access  Private (Admin only)
router.post('/variant/:id_variante/image',
  upload.single('imagen'),
  handleMulterError,
  AdminProductController.uploadImageToVariant
);

// === RUTAS PARA VARIANTES ===

// @route   GET /api/admin/products/:id_producto/variants
// @desc    Obtener todas las variantes de un producto
// @access  Private (Admin only)
router.get('/:id_producto/variants', AdminVariantController.getVariantsByProduct);

// @route   POST /api/admin/products/:id_producto/variants
// @desc    Crear nueva variante para un producto
// @access  Private (Admin only)
router.post('/:id_producto/variants', AdminVariantController.createVariant);

// @route   GET /api/admin/products/variant/:id_variante
// @desc    Obtener variante por ID
// @access  Private (Admin only)
router.get('/variant/:id_variante', AdminVariantController.getVariantById);

// @route   PUT /api/admin/products/variant/:id_variante
// @desc    Actualizar variante
// @access  Private (Admin only)
router.put('/variant/:id_variante', AdminVariantController.updateVariant);

// @route   DELETE /api/admin/products/variant/:id_variante
// @desc    Eliminar variante (incluyendo imágenes de Cloudinary)
// @access  Private (Admin only)
router.delete('/variant/:id_variante', AdminVariantController.deleteVariant);

module.exports = router;
