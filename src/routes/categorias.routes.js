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

// TEMP: Endpoint de categorías admin SIN autenticación para diagnóstico
router.get('/admin-temp', async (req, res) => {
  try {
    console.log('🔍 [TEMP] Endpoint admin temporal sin auth...');
    
    const { search } = req.query;
    
    // Verificar columnas existentes
    const columnsCheck = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
        AND column_name IN ('alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion')
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    
    let query = `
      SELECT 
        id_categoria,
        nombre,
        descripcion,
        activo,
        orden,
        fecha_creacion,
        fecha_actualizacion,
        ${existingColumns.includes('alto_cm') ? 'alto_cm' : '0 as alto_cm'},
        ${existingColumns.includes('largo_cm') ? 'largo_cm' : '0 as largo_cm'},
        ${existingColumns.includes('ancho_cm') ? 'ancho_cm' : '0 as ancho_cm'},
        ${existingColumns.includes('peso_kg') ? 'peso_kg' : '0 as peso_kg'},
        ${existingColumns.includes('nivel_compresion') ? 'nivel_compresion' : '\'baja\' as nivel_compresion'},
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
    
    console.log('🔍 [TEMP] Categorías recuperadas:', result.rows.length);
    
    res.json({
      success: true,
      categorias: result.rows,
      skydropx_columns_status: {
        alto_cm: existingColumns.includes('alto_cm'),
        largo_cm: existingColumns.includes('largo_cm'),
        ancho_cm: existingColumns.includes('ancho_cm'),
        peso_kg: existingColumns.includes('peso_kg'),
        nivel_compresion: existingColumns.includes('nivel_compresion')
      },
      temp_endpoint: true
    });
  } catch (error) {
    console.error('Error en endpoint temporal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener todas las categorías para admin (incluye inactivas)
router.get('/admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    
    // Primero verificar qué columnas existen
    const columnsCheck = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
        AND column_name IN ('alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion')
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    
    let query = `
      SELECT 
        id_categoria,
        nombre,
        descripcion,
        activo,
        orden,
        fecha_creacion,
        fecha_actualizacion,
        ${existingColumns.includes('alto_cm') ? 'alto_cm' : '0 as alto_cm'},
        ${existingColumns.includes('largo_cm') ? 'largo_cm' : '0 as largo_cm'},
        ${existingColumns.includes('ancho_cm') ? 'ancho_cm' : '0 as ancho_cm'},
        ${existingColumns.includes('peso_kg') ? 'peso_kg' : '0 as peso_kg'},
        ${existingColumns.includes('nivel_compresion') ? 'nivel_compresion' : '\'baja\' as nivel_compresion'},
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
      categorias: result.rows,
      skydropx_columns_status: {
        alto_cm: existingColumns.includes('alto_cm'),
        largo_cm: existingColumns.includes('largo_cm'),
        ancho_cm: existingColumns.includes('ancho_cm'),
        peso_kg: existingColumns.includes('peso_kg'),
        nivel_compresion: existingColumns.includes('nivel_compresion')
      }
    });
  } catch (error) {
    console.error('Error al obtener categorías para admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
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

// Endpoint para aplicar migración SkyDropX
router.post('/admin/apply-skydropx-migration', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('🚀 Iniciando migración SkyDropX...');

    // Verificar columnas existentes
    const columnsCheck = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
        AND column_name IN ('alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion')
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    const neededColumns = ['alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion'];
    const missingColumns = neededColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      return res.json({
        success: true,
        message: 'Todas las columnas SkyDropX ya existen',
        existing_columns: existingColumns
      });
    }

    console.log('📋 Columnas faltantes:', missingColumns);

    // Agregar columnas faltantes
    for (const column of missingColumns) {
      let alterQuery = '';
      switch (column) {
        case 'alto_cm':
        case 'largo_cm':
        case 'ancho_cm':
          alterQuery = `ALTER TABLE categorias ADD COLUMN ${column} DECIMAL(10,2) DEFAULT 0.00`;
          break;
        case 'peso_kg':
          alterQuery = `ALTER TABLE categorias ADD COLUMN ${column} DECIMAL(10,3) DEFAULT 0.000`;
          break;
        case 'nivel_compresion':
          alterQuery = `ALTER TABLE categorias ADD COLUMN ${column} VARCHAR(20) DEFAULT 'baja' CHECK (${column} IN ('baja', 'media', 'alta'))`;
          break;
      }
      
      if (alterQuery) {
        await database.query(alterQuery);
        console.log(`✅ Columna ${column} agregada`);
      }
    }

    // Crear función calcular_dimensiones_envio si no existe
    await database.query(`
      CREATE OR REPLACE FUNCTION calcular_dimensiones_envio(categoria_id INT)
      RETURNS JSON AS $$
      DECLARE
        categoria_data RECORD;
        config_data RECORD;
        result JSON;
      BEGIN
        -- Obtener datos de la categoría
        SELECT alto_cm, largo_cm, ancho_cm, peso_kg, nivel_compresion 
        INTO categoria_data
        FROM categorias 
        WHERE id_categoria = categoria_id;
        
        IF NOT FOUND THEN
          RETURN json_build_object('error', 'Categoría no encontrada');
        END IF;
        
        -- Obtener configuraciones de empaque
        SELECT 
          COALESCE(
            (SELECT valor::DECIMAL FROM configuraciones_sitio WHERE clave = 'empaque_peso_extra_kg'), 
            0.1
          ) as peso_extra,
          COALESCE(
            (SELECT valor::DECIMAL FROM configuraciones_sitio WHERE clave = 'empaque_margen_cm'), 
            2.0
          ) as margen_cm
        INTO config_data;
        
        -- Calcular dimensiones finales
        result := json_build_object(
          'alto_final', categoria_data.alto_cm + config_data.margen_cm,
          'largo_final', categoria_data.largo_cm + config_data.margen_cm,
          'ancho_final', categoria_data.ancho_cm + config_data.margen_cm,
          'peso_final', categoria_data.peso_kg + config_data.peso_extra,
          'nivel_compresion', categoria_data.nivel_compresion,
          'peso_extra_kg', config_data.peso_extra,
          'margen_empaque_cm', config_data.margen_cm
        );
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Función calcular_dimensiones_envio creada');

    // Insertar configuraciones básicas de SkyDropX si no existen
    const configs = [
      ['skydropx_api_key', '', 'text', 'Clave API de SkyDropX'],
      ['skydropx_webhook_url', 'https://trebodeluxe-backend.onrender.com/api/skydropx/webhook', 'text', 'URL del webhook de SkyDropX'],
      ['skydropx_enabled', 'false', 'boolean', 'Habilitar integración con SkyDropX'],
      ['empaque_peso_extra_kg', '0.1', 'number', 'Peso adicional del empaque en kg'],
      ['empaque_margen_cm', '2.0', 'number', 'Margen adicional del empaque en cm']
    ];

    for (const [clave, valor, tipo, descripcion] of configs) {
      await database.query(`
        INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (clave) DO NOTHING
      `, [clave, valor, tipo, descripcion]);
    }

    console.log('✅ Configuraciones SkyDropX insertadas');

    res.json({
      success: true,
      message: 'Migración SkyDropX aplicada exitosamente',
      columns_added: missingColumns,
      function_created: true,
      configs_inserted: true
    });

  } catch (error) {
    console.error('❌ Error aplicando migración SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error aplicando migración SkyDropX',
      error: error.message
    });
  }
});

module.exports = router;