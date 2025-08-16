// controllers/product.controller.js - Controlador para productos

const ProductModel = require('../models/product.model');
const { pool } = require('../config/db');

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

  // Obtener todas las variantes de productos (para uso público)
  static async getVariants(req, res) {
    try {
      const { limit = 100, offset = 0, id_producto } = req.query;
      
      let query = `
        SELECT 
          v.id_variante,
          v.nombre as nombre_variante,
          v.id_producto,
          p.nombre as nombre_producto,
          p.descripcion as descripcion_producto,
          COALESCE(c.nombre, 'Sin categoría') as categoria,
          p.marca,
          v.activo,
          v.fecha_creacion,
          COALESCE(MIN(s.precio), 0) as precio_minimo,
          COALESCE(SUM(s.cantidad), 0) as stock_total,
          (
            SELECT json_agg(
              json_build_object(
                'id_imagen', img.id_imagen,
                'url', img.url,
                'public_id', img.public_id,
                'orden', img.orden
              ) ORDER BY img.orden
            )
            FROM imagenes_productos img 
            WHERE img.id_producto = p.id_producto 
            AND img.activo = true
          ) as imagenes
        FROM variantes v
        INNER JOIN productos p ON v.id_producto = p.id_producto
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN stock s ON v.id_variante = s.id_variante
        WHERE v.activo = true AND p.activo = true
      `;

      const params = [];
      let paramCount = 1;

      if (id_producto) {
        query += ` AND p.id_producto = $${paramCount}`;
        params.push(id_producto);
        paramCount++;
      }

      query += `
        GROUP BY v.id_variante, v.nombre, v.id_producto, p.nombre, p.descripcion, c.nombre, p.marca, v.activo, v.fecha_creacion
        ORDER BY p.nombre, v.id_variante ASC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        message: 'Variantes obtenidas exitosamente',
        variants: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length
        }
      });

    } catch (error) {
      console.error('Error en getVariants:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener variantes',
        error: error.message
      });
    }
  }

  // Obtener productos para catálogo con solo la primera variante de cada producto
  static async getProductsForCatalog(req, res) {
    try {
      const { limit = 20, offset = 0, categoria, marca, search } = req.query;
      
      let query = `
        WITH first_variants AS (
          SELECT DISTINCT ON (p.id_producto)
            v.id_variante,
            v.nombre as nombre_variante,
            v.id_producto,
            p.nombre as nombre_producto,
            p.descripcion as descripcion_producto,
            COALESCE(c.nombre, 'Sin categoría') as categoria,
            p.marca,
            v.activo as variante_activa,
            p.activo as producto_activo,
            v.fecha_creacion,
            COALESCE(MIN(s.precio), 0) as precio_minimo,
            COALESCE(SUM(s.cantidad), 0) as stock_total
          FROM productos p
          INNER JOIN variantes v ON p.id_producto = v.id_producto
          LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
          LEFT JOIN stock s ON v.id_variante = s.id_variante
          WHERE v.activo = true AND p.activo = true
          GROUP BY p.id_producto, v.id_variante, v.nombre, p.nombre, p.descripcion, c.nombre, p.marca, v.activo, p.activo, v.fecha_creacion
          ORDER BY p.id_producto, v.id_variante ASC
        )
        SELECT 
          fv.*,
          (
            SELECT json_agg(
              json_build_object(
                'id_imagen', img.id_imagen,
                'url', img.url,
                'public_id', img.public_id,
                'orden', img.orden
              ) ORDER BY img.orden
            )
            FROM imagenes_productos img 
            WHERE img.id_producto = fv.id_producto 
            AND img.activo = true
          ) as imagenes
        FROM first_variants fv
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (categoria) {
        query += ` AND LOWER(fv.categoria) = LOWER($${paramCount})`;
        params.push(categoria);
        paramCount++;
      }

      if (marca) {
        query += ` AND LOWER(fv.marca) = LOWER($${paramCount})`;
        params.push(marca);
        paramCount++;
      }

      if (search) {
        query += ` AND (
          LOWER(fv.nombre_producto) LIKE LOWER($${paramCount}) OR 
          LOWER(fv.descripcion_producto) LIKE LOWER($${paramCount}) OR
          LOWER(fv.marca) LIKE LOWER($${paramCount})
        )`;
        params.push(`%${search}%`);
        paramCount++;
      }

      query += `
        ORDER BY fv.nombre_producto
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        message: 'Productos para catálogo obtenidos exitosamente',
        products: result.rows,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.rows.length
        }
      });

    } catch (error) {
      console.error('Error en getProductsForCatalog:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos para catálogo',
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
