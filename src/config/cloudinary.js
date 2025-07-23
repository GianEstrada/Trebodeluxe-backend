const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Función para subir imagen a Cloudinary
const uploadImage = async (filePath, folder = 'productos') => {
  try {
    console.log(`Subiendo imagen desde: ${filePath} a carpeta: ${folder}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `trebodeluxe/${folder}`,
      resource_type: 'auto',
      quality: 'auto'
      // Removido format: 'auto' porque no es válido para upload
    });

    console.log('Imagen subida exitosamente:', result.public_id);
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Error al subir imagen a Cloudinary:', error);
    throw error;
  }
};

// Función para eliminar imagen de Cloudinary
const deleteImage = async (publicId) => {
  try {
    console.log(`Eliminando imagen: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    console.log('Imagen eliminada:', result);
    return result;
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    throw error;
  }
};

// Función para obtener URL optimizada
const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width = 'auto',
    height = 'auto',
    crop = 'fit',
    quality = 'auto',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    format,
    secure: true
  });
};

// Función para generar múltiples tamaños de imagen
const generateImageVariants = (publicId) => {
  return {
    thumbnail: getOptimizedUrl(publicId, { width: 150, height: 150, crop: 'fill' }),
    small: getOptimizedUrl(publicId, { width: 300, height: 300, crop: 'fit' }),
    medium: getOptimizedUrl(publicId, { width: 600, height: 600, crop: 'fit' }),
    large: getOptimizedUrl(publicId, { width: 1200, height: 1200, crop: 'fit' }),
    original: getOptimizedUrl(publicId)
  };
};

// Función para limpiar archivos temporales
const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Archivo temporal eliminado: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error al eliminar archivo temporal ${filePath}:`, error);
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getOptimizedUrl,
  generateImageVariants,
  cleanupTempFile
};
