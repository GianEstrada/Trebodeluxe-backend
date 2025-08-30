const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const database = require('../config/db');

// Obtener todas las categorías (público)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        id_categoria,
        nombre,
        descripcion,
        activo,
        orden,
        fecha_creacion,
        fecha_actualizacion,
        alto_cm,
        largo_cm,
        ancho_cm,
        peso_kg,
        nivel_compresion
      FROM categorias 
      WHERE activo = true 
      ORDER BY orden ASC, nombre ASC
    `;
    
    const result = await database.query(query);
    
    res.json({
      success: true,
      categorias: result.rows
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener todas las categorías para admin (incluye inactivas)
router.get('/admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT 
        id_categoria,
        nombre,
        descripcion,
        activo,
        orden,
        fecha_creacion,
        fecha_actualizacion,
        alto_cm,
        largo_cm,
        ancho_cm,
        peso_kg,
        nivel_compresion,
        (SELECT COUNT(*) FROM productos WHERE id_categoria = categorias.id_categoria) as productos_count
      FROM categorias 
    `;
    
    let queryParams = [];
    
    if (search) {
      query += ` WHERE LOWER(nombre) LIKE LOWER($1) OR LOWER(descripcion) LIKE LOWER($1)`;
      queryParams.push(`%${search}%`);
    }
    
    query += ` ORDER BY orden ASC, nombre ASC`;
    
    const result = await database.query(query, queryParams);
    
    res.json({
      success: true,
      categorias: result.rows
    });
  } catch (error) {
    console.error('Error al obtener categorías para admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear nueva categoría
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      orden,
      alto_cm = 0,
      largo_cm = 0,
      ancho_cm = 0,
      peso_kg = 0,
      nivel_compresion = 'medio'
    } = req.body;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }

    // Validar nivel de compresión
    if (!['bajo', 'medio', 'alto'].includes(nivel_compresion)) {
      return res.status(400).json({
        success: false,
        message: 'El nivel de compresión debe ser: bajo, medio o alto'
      });
    }
    
    // Verificar si ya existe
    const existingCheck = await database.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)',
      [nombre.trim()]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }
    
    // Obtener el próximo orden si no se especifica
    let finalOrder = orden;
    if (!finalOrder) {
      const maxOrderResult = await database.query('SELECT COALESCE(MAX(orden), 0) + 1 as next_order FROM categorias');
      finalOrder = maxOrderResult.rows[0].next_order;
    }
    
    const query = `
      INSERT INTO categorias (
        nombre, descripcion, orden, activo,
        alto_cm, largo_cm, ancho_cm, peso_kg, nivel_compresion
      )
      VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8)
      RETURNING id_categoria, nombre, descripcion, orden, activo, fecha_creacion,
                alto_cm, largo_cm, ancho_cm, peso_kg, nivel_compresion
    `;
    
    const result = await database.query(query, [
      nombre.trim(),
      descripcion?.trim() || null,
      finalOrder,
      parseFloat(alto_cm) || 0,
      parseFloat(largo_cm) || 0,
      parseFloat(ancho_cm) || 0,
      parseFloat(peso_kg) || 0,
      nivel_compresion
    ]);
    
    res.json({
      success: true,
      message: 'Categoría creada exitosamente',
      categoria: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar categoría
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      orden, 
      activo,
      alto_cm,
      largo_cm,
      ancho_cm,
      peso_kg,
      nivel_compresion
    } = req.body;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }

    // Validar nivel de compresión si se proporciona
    if (nivel_compresion && !['bajo', 'medio', 'alto'].includes(nivel_compresion)) {
      return res.status(400).json({
        success: false,
        message: 'El nivel de compresión debe ser: bajo, medio o alto'
      });
    }
    
    // Verificar si la categoría existe
    const categoryCheck = await database.query(
      'SELECT id_categoria, alto_cm, largo_cm, ancho_cm, peso_kg, nivel_compresion FROM categorias WHERE id_categoria = $1',
      [id]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const currentCategory = categoryCheck.rows[0];
    
    // Verificar si el nombre ya existe en otra categoría
    const existingCheck = await database.query(
      'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1) AND id_categoria != $2',
      [nombre.trim(), id]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra categoría con ese nombre'
      });
    }
    
    const query = `
      UPDATE categorias 
      SET nombre = $1, descripcion = $2, orden = $3, activo = $4,
          alto_cm = $5, largo_cm = $6, ancho_cm = $7, peso_kg = $8, nivel_compresion = $9
      WHERE id_categoria = $10
      RETURNING id_categoria, nombre, descripcion, orden, activo, fecha_creacion, fecha_actualizacion,
                alto_cm, largo_cm, ancho_cm, peso_kg, nivel_compresion
    `;
    
    const result = await database.query(query, [
      nombre.trim(),
      descripcion?.trim() || null,
      orden || 0,
      activo !== undefined ? activo : true,
      alto_cm !== undefined ? parseFloat(alto_cm) || 0 : currentCategory.alto_cm,
      largo_cm !== undefined ? parseFloat(largo_cm) || 0 : currentCategory.largo_cm,
      ancho_cm !== undefined ? parseFloat(ancho_cm) || 0 : currentCategory.ancho_cm,
      peso_kg !== undefined ? parseFloat(peso_kg) || 0 : currentCategory.peso_kg,
      nivel_compresion || currentCategory.nivel_compresion,
      id
    ]);
    
    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      categoria: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Eliminar categoría
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la categoría existe
    const categoryCheck = await database.query(
      'SELECT id_categoria, nombre FROM categorias WHERE id_categoria = $1',
      [id]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    // Verificar si hay productos usando esta categoría
    const productsCheck = await database.query(
      'SELECT COUNT(*) as count FROM productos WHERE id_categoria = $1',
      [id]
    );
    
    if (parseInt(productsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría "${categoryCheck.rows[0].nombre}" porque tiene productos asociados. Primero debe reasignar o eliminar los productos.`
      });
    }
    
    await database.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
    
    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener categoría por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id_categoria,
        nombre,
        descripcion,
        activo,
        orden,
        fecha_creacion,
        fecha_actualizacion,
        alto_cm,
        largo_cm,
        ancho_cm,
        peso_kg,
        nivel_compresion,
        (SELECT COUNT(*) FROM productos WHERE id_categoria = categorias.id_categoria) as productos_count
      FROM categorias 
      WHERE id_categoria = $1
    `;
    
    const result = await database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    res.json({
      success: true,
      categoria: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Calcular dimensiones de envío para una categoría específica
router.get('/:id/dimensiones-envio', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT * FROM calcular_dimensiones_envio($1)
    `;
    
    const result = await database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }
    
    res.json({
      success: true,
      dimensiones: result.rows[0]
    });
  } catch (error) {
    console.error('Error al calcular dimensiones de envío:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener configuraciones de SkyDropX
router.get('/admin/skydropx-config', verifyToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT clave, valor, tipo, descripcion 
      FROM configuraciones_sitio 
      WHERE clave LIKE 'skydropx%' OR clave LIKE 'empaque%'
      ORDER BY clave
    `;
    
    const result = await database.query(query);
    
    res.json({
      success: true,
      configuraciones: result.rows
    });
  } catch (error) {
    console.error('Error al obtener configuraciones SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Actualizar configuraciones de SkyDropX
router.put('/admin/skydropx-config', verifyToken, requireAdmin, async (req, res) => {
  try {
    const configuraciones = req.body;
    
    for (const config of configuraciones) {
      const { clave, valor } = config;
      
      await database.query(`
        UPDATE configuraciones_sitio 
        SET valor = $1, fecha_actualizacion = CURRENT_TIMESTAMP 
        WHERE clave = $2
      `, [valor, clave]);
    }
    
    res.json({
      success: true,
      message: 'Configuraciones actualizadas exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar configuraciones SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;