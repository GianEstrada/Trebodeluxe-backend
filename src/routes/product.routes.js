const express = require('express');
const ProductController = require('../controllers/product.controller');
const authMiddleware = require('../middlewares/auth-activity.middleware');

const router = express.Router();

// === RUTAS PÚBLICAS ===

// @route   GET /api/products
// @desc    Obtener todos los productos (con paginación)
// @access  Public
router.get('/', ProductController.getProducts); // Compatibilidad con frontend existente

// @route   GET /api/products/all
// @desc    Obtener todos los productos sin paginación
// @access  Public
router.get('/all', ProductController.getAllProducts);

// @route   GET /api/products/recent
// @desc    Obtener productos agregados recientemente
// @query   limit (default: 12)
// @access  Public
router.get('/recent', ProductController.getRecentProducts);

// @route   GET /api/products/recent-by-category
// @desc    Obtener productos recientes agrupados por categoría
// @query   limit (default: 6)
// @access  Public
router.get('/recent-by-category', ProductController.getRecentByCategory);

// @route   GET /api/products/best-promotions
// @desc    Obtener mejores promociones (mayor descuento)
// @query   limit (default: 12)
// @access  Public
router.get('/best-promotions', ProductController.getBestPromotions);

// @route   GET /api/products/categories
// @desc    Obtener todas las categorías disponibles
// @access  Public
router.get('/categories', ProductController.getCategories);

// @route   GET /api/products/brands
// @desc    Obtener todas las marcas disponibles
// @access  Public
router.get('/brands', ProductController.getBrands);

// @route   GET /api/products/search
// @desc    Buscar productos
// @query   query, categoria, marca, limit, offset
// @access  Public
router.get('/search', ProductController.searchProducts);

// @route   GET /api/products/catalog
// @desc    Obtener productos para catálogo con paginación e imágenes
// @query   limit, offset, categoria, sortBy, sortOrder
// @access  Public
router.get('/catalog', ProductController.getCatalog);

// @route   GET /api/products/featured
// @desc    Obtener productos destacados para página principal
// @query   limit (default: 12)
// @access  Public
router.get('/featured', ProductController.getFeatured);

// @route   GET /api/products/variants
// @desc    Obtener todas las variantes de productos (para uso público)
// @access  Public  
router.get('/variants', ProductController.getVariants);

// @route   GET /api/products/catalog-items
// @desc    Obtener productos para catálogo (una variante por producto) con imágenes
// @query   limit, offset, categoria, marca, search
// @access  Public
router.get('/catalog-items', ProductController.getProductsForCatalog);

// @route   GET /api/products/variants/:variantId/stock
// @desc    Obtener stock específico por variante (SOLUCIÓN AL PROBLEMA DE STOCK INCORRECTO)
// @access  Public
router.get('/variants/:variantId/stock', ProductController.getStockByVariant);

// === RUTAS PARA ADMINISTRADORES ===

// @route   GET /api/products/admin
// @desc    Obtener todos los productos para administradores
// @access  Private (Admin only)
router.get('/admin', authMiddleware.verifyToken, authMiddleware.requireAdmin, ProductController.getAllProductsForAdmin);

// @route   GET /api/products/category/:categoria
// @desc    Obtener productos por categoría
// @access  Public
router.get('/category/:categoria', ProductController.getProductsByCategory);

// @route   GET /api/products/:id
// @desc    Obtener producto por ID con variantes, imágenes y stock
// @access  Public
router.get('/:id', ProductController.getProductById);

// @route   POST /api/products
// @desc    Crear nuevo producto
// @access  Private (Admin only)
router.post('/', authMiddleware.verifyToken, authMiddleware.requireAdmin, ProductController.createProduct);

// @route   PUT /api/products/:id
// @desc    Actualizar producto
// @access  Private (Admin only)
router.put('/:id', authMiddleware.verifyToken, authMiddleware.requireAdmin, ProductController.updateProduct);

// @route   DELETE /api/products/:id
// @desc    Eliminar producto
// @access  Private (Admin only)
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.requireAdmin, ProductController.deleteProduct);

module.exports = router;