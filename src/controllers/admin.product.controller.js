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
        categoria: req.query.categoria || '',
        marca: req.query.marca || '',
        activo: req.query.activo !== undefined ? req.query.activo === 'true' : null,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
        sortBy: req.query.sortBy || 'fecha_creacion',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await ProductModel.getProductsForAdmin(filters);

      res.json({
        success: true,
        message: 'Productos obtenidos exitosamente',
        data: result
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
        precio_original
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

      // Si hay imagen, subirla
      let imageData = null;
      if (req.file) {
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
  }
};

const db = require('../config/db');

module.exports = AdminProductController;
