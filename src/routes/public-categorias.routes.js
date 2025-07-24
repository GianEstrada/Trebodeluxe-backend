const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Obtener todas las categorías (público)
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * Obtener productos por categoría (público)
 */
router.get('/:id/productos', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Obtener productos activos de la categoría con información básica
    const result = await pool.query(`
      SELECT 
        p.id_producto,
        p.nombre,
        p.descripcion,
        p.marca,
        c.nombre as categoria,
        -- Obtener el primer precio del stock para mostrar en tarjetas
        (SELECT s.precio FROM stock s WHERE s.id_producto = p.id_producto AND s.precio IS NOT NULL LIMIT 1) as precio_base,
        -- Contar variantes activas
        (SELECT COUNT(*) FROM variantes v WHERE v.id_producto = p.id_producto) as total_variantes
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.id_categoria = $1 AND p.activo = true
      ORDER BY p.nombre
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);
    
    // Obtener el total de productos para paginación
    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM productos WHERE id_categoria = $1 AND activo = true', 
      [id]
    );
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(totalResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(totalResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
