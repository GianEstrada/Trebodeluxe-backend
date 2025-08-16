// main-images.controller.js - Controlador para gestionar las imágenes principales del sitio

const { pool } = require('../config/db');

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
          seccion,
          descripcion,
          estado,
          fecha_creacion,
          fecha_actualizacion
        FROM imagenes_index 
        WHERE estado != 'inactivo'
        ORDER BY seccion, estado, fecha_creacion DESC
      `;
      
      const result = await pool.query(query);
      
      // Organizar imágenes por sección
      const imagesBySection = {
        principal: [],
        banner: []
      };
      
      result.rows.forEach(imagen => {
        if (imagesBySection[imagen.seccion]) {
          imagesBySection[imagen.seccion].push(imagen);
        }
      });
      
      res.json({
        success: true,
        data: {
          all: result.rows,
          bySection: imagesBySection
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

  // Obtener imágenes por sección específica
  static async getImagesByType(req, res) {
    try {
      const { tipo } = req.params; // Mantenemos el parámetro "tipo" por compatibilidad
      
      // Mapear los tipos antiguos a las secciones nuevas
      let seccion = tipo;
      if (tipo === 'hero_banner' || tipo === 'promocion_banner') {
        seccion = 'principal';
      } else if (tipo === 'categoria_destacada') {
        seccion = 'banner';
      }
      
      const validSections = ['principal', 'banner'];
      if (!validSections.includes(seccion)) {
        return res.status(400).json({
          success: false,
          message: 'Sección de imagen no válida',
          validSections
        });
      }

      const query = `
        SELECT 
          id_imagen,
          nombre,
          url,
          public_id,
          seccion,
          descripcion,
          estado,
          fecha_creacion,
          fecha_actualizacion
        FROM imagenes_index 
        WHERE seccion = $1 AND estado != 'inactivo'
        ORDER BY fecha_creacion DESC
      `;
      
      const result = await pool.query(query, [seccion]);
      
      res.json({
        success: true,
        data: result.rows,
        section: seccion,
        total: result.rows.length
      });
    } catch (error) {
      console.error(`Error obteniendo imágenes sección ${req.params.tipo}:`, error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nueva imagen principal (temporal - sin implementar)
  static async createImage(req, res) {
    res.status(501).json({
      success: false,
      message: 'Método no implementado temporalmente'
    });
  }

  // Actualizar imagen existente (temporal - sin implementar)  
  static async updateImage(req, res) {
    res.status(501).json({
      success: false,
      message: 'Método no implementado temporalmente'
    });
  }

  // Eliminar imagen (temporal - sin implementar)
  static async deleteImage(req, res) {
    res.status(501).json({
      success: false,
      message: 'Método no implementado temporalmente'
    });
  }

  // Reordenar imágenes (temporal - sin implementar)
  static async reorderImages(req, res) {
    res.status(501).json({
      success: false,
      message: 'Método no implementado temporalmente'
    });
  }
}

module.exports = MainImagesController;
