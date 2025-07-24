const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Obtener todas las imágenes del index públicamente (sin autenticación)
const getPublicIndexImages = async (req, res) => {
  try {
    const query = `
      SELECT 
        id_imagen,
        nombre,
        descripcion,
        url,
        seccion,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM imagenes_index 
      ORDER BY fecha_creacion DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching public index images:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener imagen específica por estado (para el layout del index)
const getImageByState = async (req, res) => {
  try {
    const { estado } = req.params;
    
    // Validar estados permitidos
    const validStates = ['izquierda', 'derecha', 'activo'];
    if (!validStates.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido. Debe ser: izquierda, derecha o activo'
      });
    }
    
    const query = `
      SELECT 
        id_imagen,
        nombre,
        descripcion,
        url,
        seccion,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM imagenes_index 
      WHERE estado = $1
      ORDER BY fecha_actualizacion DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [estado]);
    
    res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching image by state:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener todas las imágenes activas organizadas por estado
const getActiveImages = async (req, res) => {
  try {
    const query = `
      SELECT 
        id_imagen,
        nombre,
        descripcion,
        url,
        seccion,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM imagenes_index 
      WHERE estado IN ('izquierda', 'derecha', 'activo')
      ORDER BY 
        CASE estado 
          WHEN 'izquierda' THEN 1
          WHEN 'derecha' THEN 2
          WHEN 'activo' THEN 3
        END,
        fecha_actualizacion DESC
    `;
    
    const result = await pool.query(query);
    
    // Organizar por estado
    const imagesByState = {
      izquierda: result.rows.filter(img => img.estado === 'izquierda')[0] || null,
      derecha: result.rows.filter(img => img.estado === 'derecha')[0] || null,
      activo: result.rows.filter(img => img.estado === 'activo')[0] || null
    };
    
    res.json({
      success: true,
      data: imagesByState
    });
  } catch (error) {
    console.error('Error fetching active images:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Rutas públicas
router.get('/index-images', getPublicIndexImages);
router.get('/index-images/active', getActiveImages);
router.get('/index-images/:estado', getImageByState);

module.exports = router;