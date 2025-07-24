const db = require('../config/db');

const ImageModel = {
  // Crear una nueva imagen para una variante
  async createVariantImage(imageData) {
    const { id_variante, url, public_id, orden = 1 } = imageData;
    
    try {
      const result = await db.query(
        'INSERT INTO imagenes_variante (id_variante, url, public_id, orden) VALUES ($1, $2, $3, $4) RETURNING *',
        [id_variante, url, public_id, orden]
      );
      
      console.log('Imagen de variante creada:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error al crear imagen de variante:', error);
      throw error;
    }
  },

  // Obtener todas las imágenes de una variante
  async getVariantImages(id_variante) {
    try {
      const result = await db.query(
        'SELECT * FROM imagenes_variante WHERE id_variante = $1 ORDER BY orden ASC',
        [id_variante]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener imágenes de variante:', error);
      throw error;
    }
  },

  // Obtener todas las imágenes de un producto con sus variantes
  async getProductImages(id_producto) {
    try {
      const result = await db.query(`
        SELECT 
          iv.id_imagen,
          iv.id_variante,
          iv.url,
          iv.public_id,
          iv.orden,
          v.nombre as variante_nombre,
          COALESCE(sp.precio_min, 0) as precio,
          NULL as precio_original
        FROM imagenes_variante iv
        JOIN variantes v ON iv.id_variante = v.id_variante
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio_min
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) sp ON v.id_variante = sp.id_variante
        WHERE v.id_producto = $1
        ORDER BY v.id_variante ASC, iv.orden ASC
      `, [id_producto]);
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener imágenes del producto:', error);
      throw error;
    }
  },

  // Actualizar el orden de una imagen
  async updateImageOrder(id_imagen, nuevo_orden) {
    try {
      const result = await db.query(
        'UPDATE imagenes_variante SET orden = $1 WHERE id_imagen = $2 RETURNING *',
        [nuevo_orden, id_imagen]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al actualizar orden de imagen:', error);
      throw error;
    }
  },

  // Eliminar una imagen
  async deleteImage(id_imagen) {
    try {
      const result = await db.query(
        'DELETE FROM imagenes_variante WHERE id_imagen = $1 RETURNING *',
        [id_imagen]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      throw error;
    }
  },

  // Obtener imagen por ID
  async getImageById(id_imagen) {
    try {
      const result = await db.query(
        'SELECT * FROM imagenes_variante WHERE id_imagen = $1',
        [id_imagen]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al obtener imagen por ID:', error);
      throw error;
    }
  },

  // Obtener la imagen principal (primera) de cada variante de un producto
  async getMainProductImages(id_producto) {
    try {
      const result = await db.query(`
        SELECT DISTINCT ON (v.id_variante)
          iv.id_imagen,
          iv.id_variante,
          iv.url,
          iv.public_id,
          v.nombre as variante_nombre,
          COALESCE(sp.precio_min, 0) as precio,
          NULL as precio_original
        FROM imagenes_variante iv
        JOIN variantes v ON iv.id_variante = v.id_variante
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio_min
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) sp ON v.id_variante = sp.id_variante
        WHERE v.id_producto = $1 AND v.activo = true
        ORDER BY v.id_variante ASC, iv.orden ASC
      `, [id_producto]);
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener imágenes principales del producto:', error);
      throw error;
    }
  },

  // Obtener imágenes para el catálogo (una imagen por producto)
  async getCatalogImages(limit = 50, offset = 0) {
    try {
      const result = await db.query(`
        SELECT DISTINCT ON (p.id_producto)
          p.id_producto,
          p.nombre as producto_nombre,
          p.categoria,
          p.marca,
          v.id_variante,
          v.nombre as variante_nombre,
          COALESCE(sp.precio_min, 0) as precio,
          NULL as precio_original,
          iv.url,
          iv.public_id
        FROM productos p
        JOIN variantes v ON p.id_producto = v.id_producto
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio_min
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) sp ON v.id_variante = sp.id_variante
        JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
        WHERE p.activo = true AND v.activo = true
        ORDER BY p.id_producto DESC, v.id_variante ASC, iv.orden ASC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener imágenes del catálogo:', error);
      throw error;
    }
  }
};

module.exports = ImageModel;
