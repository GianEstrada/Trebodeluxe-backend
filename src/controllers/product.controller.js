// controllers/product.controller.js - Controlador para productos

const ProductModel = require('../models/product.model');

class ProductController {
  // Obtener todos los productos
  static async getAllProducts(req, res) {
    try {
      const products = await ProductModel.getAll();
      
      res.status(200).json({
        success: true,
        message: 'Productos obtenidos exitosamente',
        products: products
      });
    } catch (error) {
      console.error('Error en getAllProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todos los productos para administradores (con más detalles)
  static async getAllProductsForAdmin(req, res) {
    try {
      const products = await ProductModel.getAllForAdmin();
      
      res.status(200).json({
        success: true,
        message: 'Productos para admin obtenidos exitosamente',
        products: products
      });
    } catch (error) {
      console.error('Error en getAllProductsForAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener un producto por ID
  static async getProductById(req, res) {
    try {
      const { id } = req.params;

      // Validar que el ID sea un número entero
      if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({
          success: false,
          message: 'El ID del producto debe ser un número entero válido'
        });
      }

      const product = await ProductModel.getById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Producto obtenido exitosamente',
        product: product
      });
    } catch (error) {
      console.error('Error en getProductById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener productos recientes
  static async getRecentProducts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const products = await ProductModel.getRecent(limit);
      
      res.status(200).json({
        success: true,
        message: 'Productos recientes obtenidos exitosamente',
        products: products
      });
    } catch (error) {
      console.error('Error en getRecentProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener productos recientes por categoría
  static async getRecentByCategory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 4;
      const categoriesArray = await ProductModel.getRecentByCategory(limit);
      
      // Transformar array a objeto para que el frontend lo pueda consumir correctamente
      const productsByCategory = {};
      categoriesArray.forEach(category => {
        productsByCategory[category.categoria] = category.productos;
      });
      
      res.status(200).json({
        success: true,
        message: 'Productos recientes por categoría obtenidos exitosamente',
        productsByCategory: productsByCategory
      });
    } catch (error) {
      console.error('Error en getRecentByCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener productos con mejores promociones
  static async getBestPromotions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const products = await ProductModel.getBestPromotions(limit);
      
      res.status(200).json({
        success: true,
        message: 'Productos con mejores promociones obtenidos exitosamente',
        products: products
      });
    } catch (error) {
      console.error('Error en getBestPromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear un nuevo producto
  static async createProduct(req, res) {
    try {
      const {
        nombre,
        descripcion,
        categoria,
        marca,
        id_sistema_talla,
        activo,
        variantes
      } = req.body;

      // Validaciones básicas
      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del producto es requerido'
        });
      }

      // Validar variantes si se proporcionan
      if (variantes && variantes.length > 0) {
        for (const variant of variantes) {
          if (!variant.precio || variant.precio <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Todas las variantes deben tener un precio válido'
            });
          }
        }
      }

      const productData = {
        nombre,
        descripcion,
        categoria,
        marca,
        id_sistema_talla,
        activo,
        variantes
      };

      const newProduct = await ProductModel.create(productData);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        product: newProduct
      });
    } catch (error) {
      console.error('Error en createProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar un producto
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const productData = req.body;

      const updatedProduct = await ProductModel.update(id, productData);

      res.status(200).json({
        success: true,
        message: 'Producto actualizado exitosamente',
        product: updatedProduct
      });
    } catch (error) {
      console.error('Error en updateProduct:', error);
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar un producto (marcar como inactivo)
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const deletedProduct = await ProductModel.delete(id);

      res.status(200).json({
        success: true,
        message: 'Producto eliminado exitosamente',
        product: deletedProduct
      });
    } catch (error) {
      console.error('Error en deleteProduct:', error);
      
      if (error.message === 'Producto no encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener productos por categoría
  static async getProductsByCategory(req, res) {
    try {
      const { categoria } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const products = await ProductModel.getByCategory(categoria, limit, offset);

      res.status(200).json({
        success: true,
        message: `Productos de la categoría "${categoria}" obtenidos exitosamente`,
        products: products,
        pagination: {
          limit,
          offset,
          total: products.length
        }
      });
    } catch (error) {
      console.error('Error en getProductsByCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todas las categorías
  static async getCategories(req, res) {
    try {
      const categories = await ProductModel.getCategories();

      res.status(200).json({
        success: true,
        message: 'Categorías obtenidas exitosamente',
        categories: categories
      });
    } catch (error) {
      console.error('Error en getCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todas las marcas
  static async getBrands(req, res) {
    try {
      const brands = await ProductModel.getBrands();

      res.status(200).json({
        success: true,
        message: 'Marcas obtenidas exitosamente',
        brands: brands
      });
    } catch (error) {
      console.error('Error en getBrands:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Buscar productos
  static async searchProducts(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const products = await ProductModel.search(q.trim(), limit, offset);

      res.status(200).json({
        success: true,
        message: `Resultados de búsqueda para "${q}"`,
        products: products,
        search_term: q.trim(),
        pagination: {
          limit,
          offset,
          total: products.length
        }
      });
    } catch (error) {
      console.error('Error en searchProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Método compatible con el controlador anterior (para no romper rutas existentes)
  static async getProducts(req, res) {
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

      res.status(200).json({
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
  }

  // Obtener productos para catálogo con paginación
  static async getCatalog(req, res) {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        categoria = null, 
        sortBy = 'fecha_creacion', 
        sortOrder = 'DESC' 
      } = req.query;

      const result = await ProductModel.getCatalog(
        parseInt(limit), 
        parseInt(offset), 
        categoria, 
        sortBy, 
        sortOrder
      );

      res.json({
        success: true,
        message: 'Catálogo obtenido exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error en getCatalog:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el catálogo',
        error: error.message
      });
    }
  }

  // Obtener productos destacados
  static async getFeatured(req, res) {
    try {
      const { limit = 12 } = req.query;

      const products = await ProductModel.getFeatured(parseInt(limit));

      res.json({
        success: true,
        message: 'Productos destacados obtenidos exitosamente',
        data: products
      });

    } catch (error) {
      console.error('Error en getFeatured:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos destacados',
        error: error.message
      });
    }
  }

  // Obtener categorías disponibles
  static async getCategories(req, res) {
    try {
      const categories = await ProductModel.getCategories();

      res.json({
        success: true,
        message: 'Categorías obtenidas exitosamente',
        data: categories
      });

    } catch (error) {
      console.error('Error en getCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  }

  // Obtener productos para admin con búsqueda y filtros
  static async getProductsForAdmin(req, res) {
    try {
      const {
        search = '',
        categoria = '',
        marca = '',
        activo = '',
        limit = 20,
        offset = 0,
        sortBy = 'fecha_creacion',
        sortOrder = 'DESC'
      } = req.query;

      const products = await ProductModel.getProductsForAdmin({
        search,
        categoria,
        marca,
        activo: activo !== '' ? activo === 'true' : null,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder
      });

      res.json({
        success: true,
        message: 'Productos para admin obtenidos exitosamente',
        data: products
      });

    } catch (error) {
      console.error('Error en getProductsForAdmin:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos para admin',
        error: error.message
      });
    }
  }

  // Obtener marcas disponibles
  static async getBrands(req, res) {
    try {
      const brands = await ProductModel.getBrands();

      res.json({
        success: true,
        message: 'Marcas obtenidas exitosamente',
        data: brands
      });

    } catch (error) {
      console.error('Error en getBrands:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener marcas',
        error: error.message
      });
    }
  }

  // Crear producto con variante inicial
  static async createProductWithVariant(req, res) {
    try {
      const {
        // Datos del producto
        nombre,
        descripcion,
        categoria,
        marca,
        id_sistema_talla,
        // Datos de la variante
        nombre_variante,
        precio,
        precio_original
      } = req.body;

      const product = await ProductModel.createWithVariant({
        producto: {
          nombre,
          descripcion,
          categoria,
          marca,
          id_sistema_talla: id_sistema_talla ? parseInt(id_sistema_talla) : null
        },
        variante: {
          nombre: nombre_variante,
          precio: parseFloat(precio),
          precio_original: precio_original ? parseFloat(precio_original) : null
        }
      });

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product
      });

    } catch (error) {
      console.error('Error en createProductWithVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  }

  // Actualizar producto
  static async updateProductDetails(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const product = await ProductModel.updateProduct(parseInt(id), updateData);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product
      });

    } catch (error) {
      console.error('Error en updateProductDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  }

  // Eliminar producto
  static async deleteProductById(req, res) {
    try {
      const { id } = req.params;

      const result = await ProductModel.deleteProduct(parseInt(id));

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error en deleteProductById:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      });
    }
  }
}

module.exports = ProductController;
