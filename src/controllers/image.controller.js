const ImageModel = require('../models/image.model');
const { uploadImage, deleteImage, generateImageVariants } = require('../config/cloudinary');
const { cleanupTempFile } = require('../middlewares/upload.middleware');

const ImageController = {
  // Subir imagen para una variante
  async uploadVariantImage(req, res) {
    try {
      const { id_variante } = req.params;
      const { orden } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        });
      }

      console.log('Subiendo imagen para variante:', id_variante);
      console.log('Archivo recibido:', req.file.path);

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
      console.error('Error en uploadVariantImage:', error);
      
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

  // Obtener imágenes de una variante
  async getVariantImages(req, res) {
    try {
      const { id_variante } = req.params;

      const images = await ImageModel.getVariantImages(id_variante);

      // Generar variantes de tamaño para cada imagen
      const imagesWithVariants = images.map(image => ({
        ...image,
        variants: generateImageVariants(image.public_id)
      }));

      res.json({
        success: true,
        data: imagesWithVariants
      });

    } catch (error) {
      console.error('Error en getVariantImages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las imágenes',
        error: error.message
      });
    }
  },

  // Obtener todas las imágenes de un producto
  async getProductImages(req, res) {
    try {
      const { id_producto } = req.params;

      const images = await ImageModel.getProductImages(id_producto);

      // Agrupar imágenes por variante
      const imagesByVariant = images.reduce((acc, image) => {
        if (!acc[image.id_variante]) {
          acc[image.id_variante] = {
            id_variante: image.id_variante,
            variante_nombre: image.variante_nombre,
            precio: image.precio,
            precio_original: image.precio_original,
            images: []
          };
        }

        acc[image.id_variante].images.push({
          id_imagen: image.id_imagen,
          url: image.url,
          public_id: image.public_id,
          orden: image.orden,
          variants: generateImageVariants(image.public_id)
        });

        return acc;
      }, {});

      res.json({
        success: true,
        data: Object.values(imagesByVariant)
      });

    } catch (error) {
      console.error('Error en getProductImages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las imágenes del producto',
        error: error.message
      });
    }
  },

  // Obtener imágenes para el catálogo
  async getCatalogImages(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const images = await ImageModel.getCatalogImages(
        parseInt(limit),
        parseInt(offset)
      );

      // Generar variantes para cada imagen
      const imagesWithVariants = images.map(image => ({
        ...image,
        variants: generateImageVariants(image.public_id)
      }));

      res.json({
        success: true,
        data: imagesWithVariants
      });

    } catch (error) {
      console.error('Error en getCatalogImages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener imágenes del catálogo',
        error: error.message
      });
    }
  },

  // Obtener imagen principal de cada variante de un producto
  async getMainProductImages(req, res) {
    try {
      const { id_producto } = req.params;

      const images = await ImageModel.getMainProductImages(id_producto);

      const imagesWithVariants = images.map(image => ({
        ...image,
        variants: generateImageVariants(image.public_id)
      }));

      res.json({
        success: true,
        data: imagesWithVariants
      });

    } catch (error) {
      console.error('Error en getMainProductImages:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener imágenes principales',
        error: error.message
      });
    }
  },

  // Eliminar una imagen
  async deleteVariantImage(req, res) {
    try {
      const { id_imagen } = req.params;

      // Obtener la imagen antes de eliminarla
      const image = await ImageModel.getImageById(id_imagen);

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Eliminar de Cloudinary
      await deleteImage(image.public_id);

      // Eliminar de base de datos
      const deletedImage = await ImageModel.deleteImage(id_imagen);

      res.json({
        success: true,
        message: 'Imagen eliminada exitosamente',
        data: deletedImage
      });

    } catch (error) {
      console.error('Error en deleteVariantImage:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la imagen',
        error: error.message
      });
    }
  },

  // Actualizar orden de imagen
  async updateImageOrder(req, res) {
    try {
      const { id_imagen } = req.params;
      const { orden } = req.body;

      if (!orden || isNaN(orden)) {
        return res.status(400).json({
          success: false,
          message: 'El orden debe ser un número válido'
        });
      }

      const updatedImage = await ImageModel.updateImageOrder(id_imagen, parseInt(orden));

      if (!updatedImage) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Orden de imagen actualizado exitosamente',
        data: updatedImage
      });

    } catch (error) {
      console.error('Error en updateImageOrder:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el orden de la imagen',
        error: error.message
      });
    }
  }
};

module.exports = ImageController;
