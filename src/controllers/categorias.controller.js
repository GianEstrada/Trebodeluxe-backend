const pool = require('../config/db');

/**
 * Obtener todas las categorías
 */
const getCategorias = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener una categoría por ID
 */
const getCategoriaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM categorias WHERE id_categoria = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Crear nueva categoría
 */
const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }
    
    // Verificar si ya existe una categoría con ese nombre
    const existeCategoria = await pool.query('SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)', [nombre.trim()]);
    
    if (existeCategoria.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }
    
    // Crear la categoría
    const result = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), descripcion?.trim() || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Actualizar categoría
 */
const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    // Validaciones
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }
    
    // Verificar si la categoría existe
    const categoriaExiste = await pool.query('SELECT id_categoria FROM categorias WHERE id_categoria = $1', [id]);
    
    if (categoriaExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si ya existe otra categoría con ese nombre
    const existeNombre = await pool.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1) AND id_categoria != $2', 
      [nombre.trim(), id]
    );
    
    if (existeNombre.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra categoría con ese nombre'
      });
    }
    
    // Actualizar la categoría
    const result = await pool.query(
      'UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id_categoria = $3 RETURNING *',
      [nombre.trim(), descripcion?.trim() || null, id]
    );
    
    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Eliminar categoría
 */
const deleteCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la categoría existe
    const categoriaExiste = await pool.query('SELECT id_categoria FROM categorias WHERE id_categoria = $1', [id]);
    
    if (categoriaExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si hay productos asociados a esta categoría
    const productosAsociados = await pool.query('SELECT COUNT(*) FROM productos WHERE id_categoria = $1', [id]);
    
    if (parseInt(productosAsociados.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${productosAsociados.rows[0].count} productos asociados. Primero reasigne o elimine los productos.`
      });
    }
    
    // Eliminar la categoría
    await pool.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
    
    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener productos por categoría
 */
const getProductosByCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.id_producto, p.nombre, p.descripcion, p.marca, p.activo, p.fecha_creacion
      FROM productos p 
      WHERE p.id_categoria = $1 
      ORDER BY p.nombre
    `, [id]);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  getCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getProductosByCategoria
};
