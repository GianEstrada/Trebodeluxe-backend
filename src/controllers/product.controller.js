const { validationResult } = require('express-validator');
const ProductModel = require('../models/product.model');

const ProductController = {
  // Obtener todos los productos
  async getProducts(req, res) {
    try {
      const { categoria, busqueda, marca } = req.query;
      let products;

      if (categoria) {
        products = await ProductModel.getByCategory(categoria);
      } else if (busqueda) {
        products = await ProductModel.search(busqueda);
      } else {
        products = await ProductModel.getAll();
      }

      // Filtrar por marca si se especifica
      if (marca && marca !== 'Todas') {
        products = products.filter(product => 
          product.marca && product.marca.toLowerCase() === marca.toLowerCase()
        );
      }

      res.json({
        success: true,
        products: products,
        total: products.length
      });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  },

  // Obtener producto por ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }

      const product = await ProductModel.getById(parseInt(id));
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        product: product
      });
    } catch (error) {
      console.error('Error al obtener producto por ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  },

  // Obtener categorías disponibles
  async getCategories(req, res) {
    try {
      const categories = await ProductModel.getCategories();
      
      res.json({
        success: true,
        categories: categories
      });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  },

  // Obtener marcas disponibles
  async getBrands(req, res) {
    try {
      const brands = await ProductModel.getBrands();
      
      res.json({
        success: true,
        brands: brands
      });
    } catch (error) {
      console.error('Error al obtener marcas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener marcas',
        error: error.message
      });
    }
  },

  // Obtener sistemas de tallas
  async getSizeSystems(req, res) {
    try {
      const sizeSystems = await ProductModel.getSizeSystems();
      
      res.json({
        success: true,
        sizeSystems: sizeSystems
      });
    } catch (error) {
      console.error('Error al obtener sistemas de tallas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener sistemas de tallas',
        error: error.message
      });
    }
  },

  // Verificar stock de un producto específico
  async checkStock(req, res) {
    try {
      const { idProducto, idVariante, idTalla } = req.params;
      
      if (!idProducto || !idVariante || !idTalla) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros requeridos: idProducto, idVariante, idTalla'
        });
      }

      const stock = await ProductModel.getStock(
        parseInt(idProducto), 
        parseInt(idVariante), 
        parseInt(idTalla)
      );
      
      res.json({
        success: true,
        stock: stock,
        disponible: stock > 0
      });
    } catch (error) {
      console.error('Error al verificar stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar stock',
        error: error.message
      });
    }
  },

  // Crear producto nuevo (solo admin)
  async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const productData = req.body;
      const newProduct = await ProductModel.create(productData);
      
      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        product: newProduct
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  },

  // Crear variante de producto (solo admin)
  async createVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const varianteData = req.body;
      const newVariante = await ProductModel.createVariante(varianteData);
      
      res.status(201).json({
        success: true,
        message: 'Variante creada exitosamente',
        variante: newVariante
      });
    } catch (error) {
      console.error('Error al crear variante:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear variante',
        error: error.message
      });
    }
  },

  // Agregar imagen a variante (solo admin)
  async addImageToVariant(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const imageData = req.body;
      const newImage = await ProductModel.addImageToVariant(imageData);
      
      res.status(201).json({
        success: true,
        message: 'Imagen agregada exitosamente',
        image: newImage
      });
    } catch (error) {
      console.error('Error al agregar imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar imagen',
        error: error.message
      });
    }
  },

  // Actualizar stock (solo admin)
  async updateStock(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const stockData = req.body;
      const updatedStock = await ProductModel.updateStock(stockData);
      
      res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        stock: updatedStock
      });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar stock',
        error: error.message
      });
    }
  },

  // Obtener productos destacados/populares
  async getFeaturedProducts(req, res) {
    try {
      const { limit = 8 } = req.query;
      let products = await ProductModel.getAll();
      
      // Filtrar productos con stock y ordenar por algún criterio
      products = products
        .filter(product => product.tiene_stock)
        .sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion))
        .slice(0, parseInt(limit));
      
      res.json({
        success: true,
        products: products,
        total: products.length
      });
    } catch (error) {
      console.error('Error al obtener productos destacados:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos destacados',
        error: error.message
      });
    }
  },

  // Obtener productos en promoción (con descuento)
  async getPromotionalProducts(req, res) {
    try {
      const { limit = 12 } = req.query;
      let products = await ProductModel.getAll();
      
      // Filtrar productos que tienen precio_original mayor al precio actual
      products = products.filter(product => {
        // Aquí necesitaríamos una consulta más específica para obtener precio_original
        // Por ahora simulamos que hay promociones
        return product.tiene_stock;
      }).slice(0, parseInt(limit));
      
      res.json({
        success: true,
        products: products,
        total: products.length
      });
    } catch (error) {
      console.error('Error al obtener productos en promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos en promoción',
        error: error.message
      });
    }
  },

  // Obtener productos recientes (agregados recientemente)
  async getRecentProducts(req, res) {
    try {
      const { limit = 12 } = req.query;
      
      const products = await ProductModel.getRecent(parseInt(limit));
      
      res.json({
        success: true,
        products: products,
        total: products.length
      });
    } catch (error) {
      console.error('Error al obtener productos recientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos recientes',
        error: error.message
      });
    }
  },

  // Obtener productos recientes por categoría
  async getRecentByCategory(req, res) {
    try {
      const { limit = 6 } = req.query;
      
      const products = await ProductModel.getRecentByCategory(parseInt(limit));
      
      // Agrupar por categoría
      const productsByCategory = {};
      products.forEach(product => {
        if (!productsByCategory[product.categoria]) {
          productsByCategory[product.categoria] = [];
        }
        productsByCategory[product.categoria].push(product);
      });
      
      res.json({
        success: true,
        productsByCategory: productsByCategory,
        products: products,
        total: products.length
      });
    } catch (error) {
      console.error('Error al obtener productos recientes por categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos recientes por categoría',
        error: error.message
      });
    }
  },

  // Obtener mejores promociones
  async getBestPromotions(req, res) {
    try {
      const { limit = 12 } = req.query;
      
      const products = await ProductModel.getBestPromotions(parseInt(limit));
      
      res.json({
        success: true,
        products: products,
        total: products.length
      });
    } catch (error) {
      console.error('Error al obtener mejores promociones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener mejores promociones',
        error: error.message
      });
    }
  }
};

module.exports = ProductController;