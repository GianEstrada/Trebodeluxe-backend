const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

// Obtener imagen activa por sección y estado (endpoint específico para el frontend)
const getActiveImageByState = async (req, res) => {
  try {
    const { seccion, estado } = req.params;
    
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
      WHERE seccion = $1 AND estado = $2
      LIMIT 1
    `;
    
    const result = await pool.query(query, [seccion, estado]);
    
    res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error) {
    console.error('Error fetching active image:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Rutas públicas
router.get('/index-images', getPublicIndexImages);
router.get('/index-images/:seccion/:estado', getActiveImageByState);

module.exports = router;