const ProductModel = require('../models/product.model');
const ImageModel = require('../models/image.model');
const { uploadImage, deleteImage, generateImageVariants } = require('../config/cloudinary');
const { cleanupTempFile } = require('../middlewares/upload.middleware');

const AdminProductController = {
  // Obtener productos para admin con búsqueda y filtros
  async getProducts(req, res) {
    try {
      const filters = {
        search: req.query.search || '',
        categoria: req.query.categoria || req.query.category || '',
        marca: req.query.marca || '',
        activo: req.query.activo !== undefined ? req.query.activo === 'true' : null,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'fecha_creacion',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      // Filtros adicionales del frontend
      if (req.query.minPrice) {
        filters.minPrice = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filters.maxPrice = parseFloat(req.query.maxPrice);
      }

      const result = await ProductModel.getProductsForAdmin(filters);

      res.json({
        success: true,
        message: 'Productos obtenidos exitosamente',
        ...result
      });

    } catch (error) {
      console.error('Error en AdminProductController.getProducts:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  },

  // Crear producto con variante e imagen inicial
  async createProduct(req, res) {
    try {
      const {
        nombre,
        descripcion,
        categoria,
        marca,
        id_sistema_talla,
        nombre_variante,
        precio,
        precio_original,
        imagen_url,
        imagen_public_id
      } = req.body;

      // Validaciones
      if (!nombre || !categoria || !nombre_variante || !precio) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos obligatorios: nombre, categoria, nombre_variante, precio'
        });
      }

      // Crear producto con variante
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

      // Manejar imagen
      let imageData = null;
      
      // Prioridad 1: Imagen ya subida (imagen_url e imagen_public_id en el cuerpo)
      if (imagen_url && imagen_public_id) {
        try {
          imageData = await ImageModel.createVariantImage({
            id_variante: product.variante_inicial.id_variante,
            url: imagen_url,
            public_id: imagen_public_id,
            orden: 1
          });
          console.log('Imagen pre-subida guardada en BD:', imagen_url);
        } catch (imageError) {
          console.error('Error al guardar imagen pre-subida en BD:', imageError);
        }
      }
      // Prioridad 2: Archivo subido con multer
      else if (req.file) {
        try {
          // Subir a Cloudinary
          const cloudinaryResult = await uploadImage(req.file.path, 'productos');

          // Guardar en base de datos
          imageData = await ImageModel.createVariantImage({
            id_variante: product.variante_inicial.id_variante,
            url: cloudinaryResult.url,
            public_id: cloudinaryResult.public_id,
            orden: 1
          });

          // Limpiar archivo temporal
          cleanupTempFile(req.file.path);
          console.log('Imagen subida y guardada:', cloudinaryResult.url);

        } catch (imageError) {
          console.error('Error al subir imagen:', imageError);
          // No fallar la creación del producto por error de imagen
          cleanupTempFile(req.file.path);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: {
          product,
          image: imageData
        }
      });

    } catch (error) {
      console.error('Error en AdminProductController.createProduct:', error);
      
      // Limpiar archivo temporal en caso de error
      if (req.file && req.file.path) {
        cleanupTempFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  },

  // Actualizar producto
  async updateProduct(req, res) {
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
      console.error('Error en AdminProductController.updateProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  },

  // Eliminar producto
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      const result = await ProductModel.deleteProduct(parseInt(id));

      if (!result.deletedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Eliminar imágenes de Cloudinary
      if (result.imagesToDelete && result.imagesToDelete.length > 0) {
        try {
          await Promise.all(
            result.imagesToDelete.map(publicId => deleteImage(publicId))
          );
          console.log(`${result.imagesToDelete.length} imágenes eliminadas de Cloudinary`);
        } catch (cloudinaryError) {
          console.error('Error al eliminar imágenes de Cloudinary:', cloudinaryError);
          // No fallar la eliminación del producto por error de Cloudinary
        }
      }

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente',
        data: {
          deletedProduct: result.deletedProduct,
          imagesDeleted: result.imagesToDelete?.length || 0
        }
      });

    } catch (error) {
      console.error('Error en AdminProductController.deleteProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      });
    }
  },

  // Obtener un producto completo para edición
  async getProductForEdit(req, res) {
    try {
      const { id } = req.params;

      const product = await ProductModel.getById(parseInt(id));

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Producto obtenido exitosamente',
        data: product
      });

    } catch (error) {
      console.error('Error en AdminProductController.getProductForEdit:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  },

  // Obtener datos para formulario (categorías, marcas, sistemas de talla)
  async getFormData(req, res) {
    try {
      const [categories, brands, sizeSystems] = await Promise.all([
        ProductModel.getCategories(),
        ProductModel.getBrands(),
        db.query('SELECT * FROM sistemas_talla ORDER BY nombre')
      ]);

      res.json({
        success: true,
        message: 'Datos de formulario obtenidos exitosamente',
        data: {
          categories: categories,
          brands: brands,
          sizeSystems: sizeSystems.rows
        }
      });

    } catch (error) {
      console.error('Error en AdminProductController.getFormData:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener datos del formulario',
        error: error.message
      });
    }
  },

  // Subir imagen adicional a una variante existente
  async uploadImageToVariant(req, res) {
    try {
      const { id_variante } = req.params;
      const { orden } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        });
      }

      // Subir a Cloudinary
      const cloudinaryResult = await uploadImage(req.file.path, 'productos');

      // Guardar en base de datos
      const imageData = {
        id_variante: parseInt(id_variante),
        url: cloudinaryResult.url,
        public_id: cloudinaryResult.public_id,
        orden: orden ? parseInt(orden) : 1
      };

      const savedImage = await ImageModel.createVariantImage(imageData);

      // Limpiar archivo temporal
      cleanupTempFile(req.file.path);

      // Generar variantes de tamaño
      const imageVariants = generateImageVariants(cloudinaryResult.public_id);

      res.json({
        success: true,
        message: 'Imagen subida exitosamente',
        data: {
          ...savedImage,
          variants: imageVariants
        }
      });

    } catch (error) {
      console.error('Error en AdminProductController.uploadImageToVariant:', error);
      
      // Limpiar archivo temporal en caso de error
      if (req.file && req.file.path) {
        cleanupTempFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Error al subir la imagen',
        error: error.message
      });
    }
  },

  // Obtener estadísticas del admin
  async getStats(req, res) {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT p.id_producto) as total_productos,
          COUNT(DISTINCT p.id_producto) FILTER (WHERE p.activo = true) as productos_activos,
          COUNT(DISTINCT v.id_variante) as total_variantes,
          COUNT(DISTINCT v.id_variante) FILTER (WHERE v.activo = true) as variantes_activas,
          COUNT(DISTINCT p.categoria) as total_categorias,
          COUNT(DISTINCT p.marca) as total_marcas,
          COALESCE(SUM(s.cantidad), 0) as stock_total
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        LEFT JOIN stock s ON v.id_variante = s.id_variante
      `;

      const result = await db.query(query);
      const stats = result.rows[0];

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          ...stats,
          total_productos: parseInt(stats.total_productos),
          productos_activos: parseInt(stats.productos_activos),
          total_variantes: parseInt(stats.total_variantes),
          variantes_activas: parseInt(stats.variantes_activas),
          total_categorias: parseInt(stats.total_categorias),
          total_marcas: parseInt(stats.total_marcas),
          stock_total: parseInt(stats.stock_total)
        }
      });

    } catch (error) {
      console.error('Error en AdminProductController.getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  },

  // =================== MÉTODOS PARA VARIANTES ===================
  
  // Crear variante
  async createVariant(req, res) {
    try {
      const { producto_id, nombre, descripcion, precio, activo = true, stock } = req.body;

      // Validaciones
      if (!producto_id || !nombre || !precio) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: producto_id, nombre, precio'
        });
      }

      // Verificar que el producto existe
      const productExists = await ProductModel.getProductById(producto_id);
      if (!productExists) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Crear variante
      const variantData = {
        producto_id: parseInt(producto_id),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio: parseFloat(precio),
        activo: Boolean(activo),
        imagen: null // Se manejará por separado
      };

      const variant = await ProductModel.createVariant(variantData);

      // Manejar stock si se proporciona
      if (stock && Array.isArray(stock) && stock.length > 0) {
        await Promise.all(
          stock.map(async (stockItem) => {
            if (stockItem.talla_id && stockItem.cantidad > 0) {
              await ProductModel.createOrUpdateStock({
                variante_id: variant.id,
                talla_id: parseInt(stockItem.talla_id),
                cantidad: parseInt(stockItem.cantidad)
              });
            }
          })
        );
      }

      res.status(201).json({
        success: true,
        message: 'Variante creada exitosamente',
        data: variant
      });

    } catch (error) {
      console.error('Error en AdminProductController.createVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear variante',
        error: error.message
      });
    }
  },

  // Actualizar variante
  async updateVariant(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, precio, activo, stock } = req.body;

      const updateData = {
        nombre: nombre?.trim(),
        descripcion: descripcion?.trim() || null,
        precio: precio ? parseFloat(precio) : undefined,
        activo: activo !== undefined ? Boolean(activo) : undefined
      };

      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const variant = await ProductModel.updateVariant(parseInt(id), updateData);

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
        });
      }

      // Actualizar stock si se proporciona
      if (stock && Array.isArray(stock)) {
        // Primero eliminar stock existente
        await ProductModel.deleteVariantStock(variant.id);
        
        // Crear nuevo stock
        await Promise.all(
          stock.map(async (stockItem) => {
            if (stockItem.talla_id && stockItem.cantidad > 0) {
              await ProductModel.createOrUpdateStock({
                variante_id: variant.id,
                talla_id: parseInt(stockItem.talla_id),
                cantidad: parseInt(stockItem.cantidad)
              });
            }
          })
        );
      }

      res.json({
        success: true,
        message: 'Variante actualizada exitosamente',
        data: variant
      });

    } catch (error) {
      console.error('Error en AdminProductController.updateVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar variante',
        error: error.message
      });
    }
  },

  // Eliminar variante
  async deleteVariant(req, res) {
    try {
      const { id } = req.params;

      const result = await ProductModel.deleteVariant(parseInt(id));

      if (!result.deletedVariant) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Variante eliminada exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error en AdminProductController.deleteVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar variante',
        error: error.message
      });
    }
  },

  // Obtener variante por ID
  async getVariant(req, res) {
    try {
      const { id } = req.params;

      const variant = await ProductModel.getVariantById(parseInt(id));

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Variante obtenida exitosamente',
        data: variant
      });

    } catch (error) {
      console.error('Error en AdminProductController.getVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener variante',
        error: error.message
      });
    }
  }
};

const db = require('../config/db');

module.exports = AdminProductController;
