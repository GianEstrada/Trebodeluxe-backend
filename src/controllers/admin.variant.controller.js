const VariantModel = require('../models/variant.model');
const { deleteImage } = require('../config/cloudinary');

const AdminVariantController = {
  // Obtener todas las variantes de un producto
  async getVariantsByProduct(req, res) {
    try {
      const { id_producto } = req.params;

      const variants = await VariantModel.getVariantsByProduct(parseInt(id_producto));

      res.json({
        success: true,
        message: 'Variantes obtenidas exitosamente',
        data: variants
      });

    } catch (error) {
      console.error('Error en AdminVariantController.getVariantsByProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener variantes',
        error: error.message
      });
    }
  },

  // Crear nueva variante
  async createVariant(req, res) {
    try {
      const { id_producto } = req.params;
      const { nombre, precio, precio_original } = req.body;

      // Validaciones
      if (!nombre || !precio) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos obligatorios: nombre y precio'
        });
      }

      const variantData = {
        id_producto: parseInt(id_producto),
        nombre,
        precio: parseFloat(precio),
        precio_original: precio_original ? parseFloat(precio_original) : null
      };

      const variant = await VariantModel.createVariant(variantData);

      res.status(201).json({
        success: true,
        message: 'Variante creada exitosamente',
        data: variant
      });

    } catch (error) {
      console.error('Error en AdminVariantController.createVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear variante',
        error: error.message
      });
    }
  },

  // Obtener variante por ID
  async getVariantById(req, res) {
    try {
      const { id_variante } = req.params;

      const variant = await VariantModel.getById(parseInt(id_variante));

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
      console.error('Error en AdminVariantController.getVariantById:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener variante',
        error: error.message
      });
    }
  },

  // Actualizar variante
  async updateVariant(req, res) {
    try {
      const { id_variante } = req.params;
      const updateData = req.body;

      const variant = await VariantModel.updateVariant(parseInt(id_variante), updateData);

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Variante actualizada exitosamente',
        data: variant
      });

    } catch (error) {
      console.error('Error en AdminVariantController.updateVariant:', error);
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
      const { id_variante } = req.params;

      const result = await VariantModel.deleteVariant(parseInt(id_variante));

      if (!result.deletedVariant) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
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
          // No fallar la eliminación de la variante por error de Cloudinary
        }
      }

      res.json({
        success: true,
        message: 'Variante eliminada exitosamente',
        data: {
          deletedVariant: result.deletedVariant,
          imagesDeleted: result.imagesToDelete?.length || 0
        }
      });

    } catch (error) {
      console.error('Error en AdminVariantController.deleteVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar variante',
        error: error.message
      });
    }
  }
};

module.exports = AdminVariantController;
