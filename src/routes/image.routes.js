const express = require('express');
const router = express.Router();
const ImageController = require('../controllers/image.controller');
const { upload, handleMulterError } = require('../middlewares/upload.middleware');

// Rutas para manejo de imágenes

// Subir imagen a una variante específica
router.post('/variant/:id_variante', 
  upload.single('image'), 
  handleMulterError,
  ImageController.uploadVariantImage
);

// Obtener imágenes de una variante específica
router.get('/variant/:id_variante', ImageController.getVariantImages);

// Obtener todas las imágenes de un producto (agrupadas por variante)
router.get('/product/:id_producto', ImageController.getProductImages);

// Obtener imagen principal de cada variante de un producto
router.get('/product/:id_producto/main', ImageController.getMainProductImages);

// Obtener imágenes para el catálogo (una por producto)
router.get('/catalog', ImageController.getCatalogImages);

// Eliminar una imagen específica
router.delete('/:id_imagen', ImageController.deleteVariantImage);

// Actualizar el orden de una imagen
router.put('/:id_imagen/order', ImageController.updateImageOrder);

// Subir múltiples imágenes a una variante (máximo 5)
router.post('/variant/:id_variante/multiple',
  upload.array('images', 5),
  handleMulterError,
  async (req, res) => {
    try {
      const { id_variante } = req.params;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron archivos'
        });
      }

      console.log(`Subiendo ${req.files.length} imágenes para variante: ${id_variante}`);

      const uploadPromises = req.files.map((file, index) => {
        // Simular el objeto req para cada archivo
        const mockReq = {
          file,
          params: { id_variante },
          body: { orden: index + 1 }
        };

        return new Promise((resolve, reject) => {
          const mockRes = {
            json: (data) => {
              if (data.success) {
                resolve(data.data);
              } else {
                reject(new Error(data.message));
              }
            },
            status: () => mockRes
          };

          ImageController.uploadVariantImage(mockReq, mockRes);
        });
      });

      const results = await Promise.allSettled(uploadPromises);
      
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      const failed = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason.message);

      res.json({
        success: true,
        message: `${successful.length} imágenes subidas exitosamente`,
        data: {
          uploaded: successful,
          failed: failed.length > 0 ? failed : undefined,
          total: req.files.length,
          successful: successful.length,
          errors: failed.length
        }
      });

    } catch (error) {
      console.error('Error en upload múltiple:', error);
      
      // Limpiar archivos temporales en caso de error
      if (req.files) {
        const { cleanupTempFile } = require('../middlewares/upload.middleware');
        req.files.forEach(file => cleanupTempFile(file.path));
      }

      res.status(500).json({
        success: false,
        message: 'Error al subir las imágenes',
        error: error.message
      });
    }
  }
);

module.exports = router;
