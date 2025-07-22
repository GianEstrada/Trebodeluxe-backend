// main-images.controller.js - Controlador para gestionar las imágenes principales del sitio

const db = require('../config/db');

class MainImagesController {
  // Obtener todas las imágenes principales
  static async getAllImages(req, res) {
    try {
      const query = `
        SELECT 
          id_imagen,
          nombre,
          url,
          public_id,
          tipo,
          titulo,
          subtitulo,
          enlace,
          orden,
          activo,
          fecha_creacion,
          fecha_actualizacion
        FROM imagenes_principales 
        WHERE activo = true 
        ORDER BY tipo, orden, fecha_creacion DESC
      `;
      
      const result = await db.pool.query(query);
      
      // Organizar imágenes por tipo
      const imagesByType = {
        hero_banner: [],
        promocion_banner: [],
        categoria_destacada: []
      };
      
      result.rows.forEach(imagen => {
        if (imagesByType[imagen.tipo]) {
          imagesByType[imagen.tipo].push(imagen);
        }
      });
      
      res.json({
        success: true,
        data: {
          all: result.rows,
          byType: imagesByType
        },
        total: result.rows.length
      });
    } catch (error) {
      console.error('Error obteniendo imágenes principales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener imágenes por tipo específico
  static async getImagesByType(req, res) {
    try {
      const { tipo } = req.params;
      
      const validTypes = ['hero_banner', 'promocion_banner', 'categoria_destacada'];
      if (!validTypes.includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de imagen no válido',
          validTypes
        });
      }

      const query = `
        SELECT 
          id_imagen,
          nombre,
          url,
          public_id,
          tipo,
          titulo,
          subtitulo,
          enlace,
          orden,
          activo,
          fecha_creacion,
          fecha_actualizacion
        FROM imagenes_principales 
        WHERE tipo = $1 AND activo = true 
        ORDER BY orden, fecha_creacion DESC
      `;
      
      const result = await db.pool.query(query, [tipo]);
      
      res.json({
        success: true,
        data: result.rows,
        type: tipo,
        total: result.rows.length
      });
    } catch (error) {
      console.error(`Error obteniendo imágenes tipo ${req.params.tipo}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nueva imagen principal
  static async createImage(req, res) {
    try {
      const { 
        nombre, 
        url, 
        public_id, 
        tipo, 
        titulo, 
        subtitulo, 
        enlace, 
        orden = 1 
      } = req.body;

      // Validar campos requeridos
      if (!nombre || !url || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, URL y tipo son requeridos'
        });
      }

      const validTypes = ['hero_banner', 'promocion_banner', 'categoria_destacada'];
      if (!validTypes.includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de imagen no válido',
          validTypes
        });
      }

      const query = `
        INSERT INTO imagenes_principales 
        (nombre, url, public_id, tipo, titulo, subtitulo, enlace, orden) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `;

      const result = await db.pool.query(query, [
        nombre, url, public_id, tipo, titulo, subtitulo, enlace, orden
      ]);

      res.status(201).json({
        success: true,
        message: 'Imagen creada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creando imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar imagen existente
  static async updateImage(req, res) {
    try {
      const { id } = req.params;
      const { 
        nombre, 
        url, 
        public_id, 
        tipo, 
        titulo, 
        subtitulo, 
        enlace, 
        orden,
        activo 
      } = req.body;

      // Verificar que la imagen existe
      const checkQuery = 'SELECT id_imagen FROM imagenes_principales WHERE id_imagen = $1';
      const checkResult = await db.pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      // Construir query de actualización dinámicamente
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (nombre !== undefined) {
        fields.push(`nombre = $${paramCount++}`);
        values.push(nombre);
      }
      if (url !== undefined) {
        fields.push(`url = $${paramCount++}`);
        values.push(url);
      }
      if (public_id !== undefined) {
        fields.push(`public_id = $${paramCount++}`);
        values.push(public_id);
      }
      if (tipo !== undefined) {
        fields.push(`tipo = $${paramCount++}`);
        values.push(tipo);
      }
      if (titulo !== undefined) {
        fields.push(`titulo = $${paramCount++}`);
        values.push(titulo);
      }
      if (subtitulo !== undefined) {
        fields.push(`subtitulo = $${paramCount++}`);
        values.push(subtitulo);
      }
      if (enlace !== undefined) {
        fields.push(`enlace = $${paramCount++}`);
        values.push(enlace);
      }
      if (orden !== undefined) {
        fields.push(`orden = $${paramCount++}`);
        values.push(orden);
      }
      if (activo !== undefined) {
        fields.push(`activo = $${paramCount++}`);
        values.push(activo);
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      values.push(id);
      const query = `
        UPDATE imagenes_principales 
        SET ${fields.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_imagen = $${paramCount}
        RETURNING *
      `;

      const result = await db.pool.query(query, values);

      res.json({
        success: true,
        message: 'Imagen actualizada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error actualizando imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar imagen (soft delete)
  static async deleteImage(req, res) {
    try {
      const { id } = req.params;

      const query = `
        UPDATE imagenes_principales 
        SET activo = false, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_imagen = $1
        RETURNING id_imagen, nombre
      `;

      const result = await db.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Imagen no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Imagen eliminada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Reordenar imágenes de un tipo específico
  static async reorderImages(req, res) {
    try {
      const { tipo } = req.params;
      const { imageOrder } = req.body; // Array de objetos {id, orden}

      if (!Array.isArray(imageOrder)) {
        return res.status(400).json({
          success: false,
          message: 'imageOrder debe ser un array'
        });
      }

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        for (const item of imageOrder) {
          await client.query(
            'UPDATE imagenes_principales SET orden = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_imagen = $2 AND tipo = $3',
            [item.orden, item.id, tipo]
          );
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Orden actualizado exitosamente',
          updatedCount: imageOrder.length
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error reordenando imágenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = MainImagesController;
