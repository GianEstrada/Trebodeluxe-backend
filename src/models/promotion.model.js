// models/promotion.model.js - Modelo para manejar promociones

const db = require('../config/db');

class PromotionModel {
  // Obtener promociones activas con consulta simple (fallback)
  static async getActiveSimple() {
    try {
      // Primero verificar qué columnas existen
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'promociones' 
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await db.query(columnsQuery);
      const availableColumns = columnsResult.rows.map(row => row.column_name);
      console.log('✅ Columnas disponibles en promociones:', availableColumns);
      
      // Consulta que incluye detalles específicos de cada promoción
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.activo,
          p.fecha_inicio,
          p.fecha_fin,
          -- Obtener el porcentaje real de promo_porcentaje
          COALESCE(pp.porcentaje, 0) as valor_descuento,
          'porcentaje' as tipo_promocion,
          CASE 
            WHEN pa.tipo_objetivo = 'todos' THEN 'todos'
            WHEN pa.tipo_objetivo = 'categoria' THEN 'categoria'
            WHEN pa.tipo_objetivo = 'producto' THEN 'producto_especifico'
            ELSE 'todos'
          END as aplicable_a,
          pa.id_producto as producto_id,
          pa.id_categoria,
          CASE 
            WHEN pa.id_categoria = '1' OR pa.id_categoria = 'Playeras' THEN 'Playeras'
            WHEN pa.id_categoria = '2' OR pa.id_categoria = 'Hoodies' THEN 'Hoodies'
            WHEN pa.id_categoria = '3' OR pa.id_categoria = 'Pantalones' THEN 'Pantalones'
            WHEN pa.id_categoria = '4' OR pa.id_categoria = 'Zapatos' THEN 'Zapatos'
            WHEN pa.id_categoria = '5' OR pa.id_categoria = 'Accesorios' THEN 'Accesorios'
            WHEN pa.id_categoria = '6' OR pa.id_categoria = 'Goodies' THEN 'Goodies'
            ELSE pa.id_categoria
          END as categoria
        FROM promociones p
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        WHERE p.activo = true
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
        ORDER BY p.id_promocion DESC
        LIMIT 20
      `;
      
      const result = await db.query(query);
      console.log('✅ Consulta con aplicaciones reales exitosa, promociones encontradas:', result.rows.length);
      
      // Log para debug de categorías y productos específicos
      result.rows.forEach(promo => {
        console.log(`🎯 Promoción ${promo.nombre}: aplicable_a=${promo.aplicable_a}, categoria=${promo.categoria}, producto_id=${promo.producto_id}, descuento=${promo.valor_descuento}%`);
      });
      
      return result.rows;
    } catch (error) {
      console.error('Error en getActiveSimple:', error);
      
      // Fallback extremo: retornar promociones dummy
      console.log('🔄 Usando fallback extremo con datos dummy');
      return [
        {
          id_promocion: 1,
          nombre: 'Promoción General de Prueba',
          tipo: 'porcentaje',
          activo: true,
          tipo_promocion: 'porcentaje',
          valor_descuento: 20,
          aplicable_a: 'todos',
          producto_id: null,
          categoria: null
        },
        {
          id_promocion: 2,
          nombre: 'Descuento Hoodies',
          tipo: 'porcentaje', 
          activo: true,
          tipo_promocion: 'porcentaje',
          valor_descuento: 25,
          aplicable_a: 'categoria',
          producto_id: null,
          categoria: 'Hoodies'
        },
        {
          id_promocion: 3,
          nombre: 'Oferta Goodies',
          tipo: 'porcentaje',
          activo: true,
          tipo_promocion: 'porcentaje',
          valor_descuento: 15,
          aplicable_a: 'categoria',
          producto_id: null,
          categoria: 'Goodies'
        }
      ];
    }
  }

  // Obtener promociones aplicables a un producto específico
  static async getPromotionsForProduct(productId, categoria = null) {
    try {
      console.log(`🔍 Buscando promociones para producto ID: ${productId}, categoría: ${categoria}`);
      
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.activo,
          p.fecha_inicio,
          p.fecha_fin,
          COALESCE(pp.porcentaje, 0) as valor_descuento,
          'porcentaje' as tipo_promocion,
          CASE 
            WHEN pa.tipo_objetivo = 'todos' THEN 'todos'
            WHEN pa.tipo_objetivo = 'categoria' THEN 'categoria'
            WHEN pa.tipo_objetivo = 'producto' THEN 'producto_especifico'
            ELSE 'todos'
          END as aplicable_a,
          pa.id_producto as producto_id,
          pa.id_categoria,
          CASE 
            WHEN pa.id_categoria = '1' OR LOWER(pa.id_categoria) = 'playeras' THEN 'Playeras'
            WHEN pa.id_categoria = '2' OR LOWER(pa.id_categoria) = 'hoodies' OR LOWER(pa.id_categoria) = 'hoodie' THEN 'Hoodies'
            WHEN pa.id_categoria = '3' OR LOWER(pa.id_categoria) = 'pantalones' THEN 'Pantalones'
            WHEN pa.id_categoria = '4' OR LOWER(pa.id_categoria) = 'zapatos' THEN 'Zapatos'
            WHEN pa.id_categoria = '5' OR LOWER(pa.id_categoria) = 'accesorios' THEN 'Accesorios'
            WHEN pa.id_categoria = '6' OR LOWER(pa.id_categoria) = 'goodies' THEN 'Goodies'
            ELSE pa.id_categoria
          END as categoria,
          -- Prioridad: 1=Producto específico, 2=Categoría, 3=General
          CASE 
            WHEN pa.tipo_objetivo = 'producto' AND pa.id_producto = $1 THEN 1
            WHEN pa.tipo_objetivo = 'categoria' AND (
              pa.id_categoria = $2 OR 
              LOWER(pa.id_categoria) = LOWER($2) OR
              (LOWER($2) = 'hoodie' AND LOWER(pa.id_categoria) = 'hoodies') OR
              (LOWER($2) = 'hoodies' AND LOWER(pa.id_categoria) = 'hoodie')
            ) THEN 2
            WHEN pa.tipo_objetivo = 'todos' THEN 3
            ELSE 4
          END as prioridad
        FROM promociones p
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        WHERE p.activo = true
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
          AND (
            -- Promociones generales (todos)
            pa.tipo_objetivo = 'todos' OR
            -- Promociones por producto específico
            (pa.tipo_objetivo = 'producto' AND pa.id_producto = $1) OR
            -- Promociones por categoría (múltiples variantes)
            (pa.tipo_objetivo = 'categoria' AND (
              pa.id_categoria = $2 OR 
              LOWER(pa.id_categoria) = LOWER($2) OR
              (LOWER($2) = 'hoodie' AND LOWER(pa.id_categoria) = 'hoodies') OR
              (LOWER($2) = 'hoodies' AND LOWER(pa.id_categoria) = 'hoodie') OR
              (LOWER($2) = 'playeras' AND pa.id_categoria = '1') OR
              (LOWER($2) = 'goodies' AND pa.id_categoria = '6')
            ))
          )
        ORDER BY 
          prioridad ASC,  -- Producto específico primero, luego categoría, luego general
          COALESCE(pp.porcentaje, 0) DESC
        LIMIT 5
      `;
      
      const result = await db.query(query, [productId, categoria]);
      
      console.log(`🎯 Promociones encontradas para producto ${productId}: ${result.rows.length}`);
      result.rows.forEach(promo => {
        console.log(`  - ${promo.nombre}: ${promo.valor_descuento}% (${promo.aplicable_a}, prioridad: ${promo.prioridad})`);
      });
      
      return result.rows;
      
    } catch (error) {
      console.error('Error en getPromotionsForProduct:', error);
      return [];
    }
  }

  // Función de debug para ver todas las promociones y aplicaciones
  static async debugAllPromotions() {
    try {
      console.log('🔍 === INICIANDO DEBUG DE PROMOCIONES ===');
      
      // Primero verificamos qué tablas existen
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%promo%'
      `;
      
      const tablesResult = await db.query(tablesQuery);
      console.log('📋 Tablas relacionadas con promociones:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
      // Verificamos la estructura de la tabla promociones
      const promocionesQuery = `SELECT * FROM promociones LIMIT 1`;
      const promocionesResult = await db.query(promocionesQuery);
      console.log('🏷️ Promociones encontradas:', promocionesResult.rows.length);
      
      // Verificamos la estructura de promo_porcentaje
      const porcentajeQuery = `SELECT * FROM promo_porcentaje LIMIT 1`;
      const porcentajeResult = await db.query(porcentajeQuery);
      console.log('📊 Registros de porcentaje:', porcentajeResult.rows.length);
      
      // Verificamos promocion_aplicacion
      const aplicacionQuery = `SELECT * FROM promocion_aplicacion LIMIT 1`;
      const aplicacionResult = await db.query(aplicacionQuery);
      console.log('🎯 Registros de aplicación:', aplicacionResult.rows.length);
      
      // Consulta simple sin JOINs
      const simpleQuery = `
        SELECT id_promocion, nombre, tipo, activo, fecha_inicio, fecha_fin
        FROM promociones
        ORDER BY id_promocion
      `;
      
      const result = await db.query(simpleQuery);
      console.log(`📈 Total promociones base: ${result.rows.length}`);
      
      return result.rows;
      
    } catch (error) {
      console.error('Error en debugAllPromotions:', error);
      return [];
    }
  }

  // Obtener todas las promociones activas
  static async getAllActive() {
    try {
      const query = `
        SELECT 
          p.*,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN
              json_build_object('porcentaje', COALESCE(pp.porcentaje, 0))
            WHEN p.tipo = 'codigo' THEN
              json_build_object(
                'codigo', pc.codigo,
                'descuento', pc.descuento,
                'tipo_descuento', pc.tipo_descuento
              )
          END as detalles,
          array_agg(
            DISTINCT json_build_object(
              'tipo_objetivo', pa.tipo_objetivo,
              'id_categoria', pa.id_categoria,
              'id_producto', pa.id_producto
            )
          ) FILTER (WHERE pa.id_aplicacion IS NOT NULL) as aplicaciones
        FROM promociones p
        LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        WHERE p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
        GROUP BY p.id_promocion, pxy.cantidad_comprada, pxy.cantidad_pagada, 
                 COALESCE(pp.porcentaje, 0), pc.codigo, pc.descuento, pc.tipo_descuento
        ORDER BY p.fecha_creacion DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllActive promociones:', error);
      throw error;
    }
  }

  // Obtener promociones aplicables a un producto específico
  static async getApplicableToProduct(productId, categoria) {
    try {
      const query = `
        SELECT 
          p.*,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN
              json_build_object('porcentaje', COALESCE(pp.porcentaje, 0))
            WHEN p.tipo = 'codigo' THEN
              json_build_object(
                'codigo', pc.codigo,
                'descuento', pc.descuento,
                'tipo_descuento', pc.tipo_descuento
              )
          END as detalles
        FROM promociones p
        LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        INNER JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        WHERE p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
          AND (
            pa.tipo_objetivo = 'todos' OR
            (pa.tipo_objetivo = 'producto' AND pa.id_producto = $1) OR
            (pa.tipo_objetivo = 'categoria' AND pa.id_categoria = $2)
          )
        ORDER BY p.fecha_creacion DESC
      `;
      
      const result = await db.query(query, [productId, categoria]);
      return result.rows;
    } catch (error) {
      console.error('Error en getApplicableToProduct:', error);
      throw error;
    }
  }

  // Crear una nueva promoción
  static async create(promotionData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insertar la promoción base
      const insertPromoQuery = `
        INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, uso_maximo, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const promoResult = await client.query(insertPromoQuery, [
        promotionData.nombre,
        promotionData.tipo,
        promotionData.fecha_inicio,
        promotionData.fecha_fin,
        promotionData.uso_maximo || null,
        promotionData.activo !== false
      ]);
      
      const promocionId = promoResult.rows[0].id_promocion;
      
      // Insertar detalles según el tipo de promoción
      switch (promotionData.tipo) {
        case 'x_por_y':
          await client.query(
            'INSERT INTO promo_x_por_y (id_promocion, cantidad_comprada, cantidad_pagada) VALUES ($1, $2, $3)',
            [promocionId, promotionData.cantidad_comprada, promotionData.cantidad_pagada]
          );
          break;
          
        case 'porcentaje':
          await client.query(
            'INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, $2)',
            [promocionId, promotionData.porcentaje]
          );
          break;
          
        case 'codigo':
          await client.query(
            'INSERT INTO promo_codigo (id_promocion, codigo, descuento, tipo_descuento) VALUES ($1, $2, $3, $4)',
            [promocionId, promotionData.codigo, promotionData.descuento, promotionData.tipo_descuento]
          );
          break;
      }
      
      // Insertar aplicaciones
      if (promotionData.aplicaciones && promotionData.aplicaciones.length > 0) {
        for (const app of promotionData.aplicaciones) {
          await client.query(
            'INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_categoria, id_producto) VALUES ($1, $2, $3, $4)',
            [promocionId, app.tipo_objetivo, app.id_categoria || null, app.id_producto || null]
          );
        }
      }
      
      await client.query('COMMIT');
      return promoResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en create promoción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener todas las promociones (para admin)
  static async getAll() {
    try {
      const query = `
        SELECT 
          p.*,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN
              json_build_object('porcentaje', COALESCE(pp.porcentaje, 0))
            WHEN p.tipo = 'codigo' THEN
              json_build_object(
                'codigo', pc.codigo,
                'descuento', pc.descuento,
                'tipo_descuento', pc.tipo_descuento
              )
          END as detalles,
          array_agg(
            DISTINCT json_build_object(
              'tipo_objetivo', pa.tipo_objetivo,
              'id_categoria', pa.id_categoria,
              'id_producto', pa.id_producto
            )
          ) FILTER (WHERE pa.id_aplicacion IS NOT NULL) as aplicaciones
        FROM promociones p
        LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        GROUP BY p.id_promocion, pxy.cantidad_comprada, pxy.cantidad_pagada, 
                 COALESCE(pp.porcentaje, 0), pc.codigo, pc.descuento, pc.tipo_descuento
        ORDER BY p.fecha_creacion DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAll promociones:', error);
      throw error;
    }
  }

  // Actualizar una promoción
  static async update(id, promotionData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar la promoción base
      const updateQuery = `
        UPDATE promociones 
        SET nombre = $1, fecha_inicio = $2, fecha_fin = $3, uso_maximo = $4, activo = $5
        WHERE id_promocion = $6
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [
        promotionData.nombre,
        promotionData.fecha_inicio,
        promotionData.fecha_fin,
        promotionData.uso_maximo || null,
        promotionData.activo !== false,
        id
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Promoción no encontrada');
      }
      
      // Actualizar detalles según el tipo
      const tipo = result.rows[0].tipo;
      switch (tipo) {
        case 'x_por_y':
          await client.query(
            'UPDATE promo_x_por_y SET cantidad_comprada = $1, cantidad_pagada = $2 WHERE id_promocion = $3',
            [promotionData.cantidad_comprada, promotionData.cantidad_pagada, id]
          );
          break;
          
        case 'porcentaje':
          await client.query(
            'UPDATE promo_porcentaje SET porcentaje = $1 WHERE id_promocion = $2',
            [promotionData.porcentaje, id]
          );
          break;
          
        case 'codigo':
          await client.query(
            'UPDATE promo_codigo SET codigo = $1, descuento = $2, tipo_descuento = $3 WHERE id_promocion = $4',
            [promotionData.codigo, promotionData.descuento, promotionData.tipo_descuento, id]
          );
          break;
      }
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en update promoción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Eliminar una promoción
  static async delete(id) {
    try {
      const query = 'DELETE FROM promociones WHERE id_promocion = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Promoción no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en delete promoción:', error);
      throw error;
    }
  }

  // Validar código de promoción
  static async validateCode(codigo) {
    try {
      const query = `
        SELECT 
          p.*,
          pc.codigo,
          pc.descuento,
          pc.tipo_descuento,
          array_agg(
            DISTINCT json_build_object(
              'tipo_objetivo', pa.tipo_objetivo,
              'id_categoria', pa.id_categoria,
              'id_producto', pa.id_producto
            )
          ) FILTER (WHERE pa.id_aplicacion IS NOT NULL) as aplicaciones
        FROM promociones p
        INNER JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        WHERE pc.codigo = $1
          AND p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
          AND (p.uso_maximo IS NULL OR p.veces_usado < p.uso_maximo)
        GROUP BY p.id_promocion, pc.codigo, pc.descuento, pc.tipo_descuento
      `;
      
      const result = await db.query(query, [codigo.toUpperCase()]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error en validateCode:', error);
      throw error;
    }
  }

  // Obtener promociones para la página principal con imágenes de productos
  static async getHomepagePromotions(limit = 5) {
    try {
      const query = `
        SELECT DISTINCT
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.fecha_inicio,
          p.fecha_fin,
          p.uso_maximo,
          p.veces_usado,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN 
              json_build_object(
                'porcentaje', COALESCE(pp.porcentaje, 0)
              )
            WHEN p.tipo = 'codigo' THEN 
              json_build_object(
                'codigo', pc.codigo,
                'descuento', pc.descuento,
                'tipo_descuento', pc.tipo_descuento
              )
          END as detalles,
          -- Imagen de ejemplo del primer producto aplicable
          iv.url as imagen_ejemplo,
          iv.public_id as imagen_public_id,
          prod.nombre as producto_ejemplo,
          prod.categoria as categoria_ejemplo
        FROM promociones p
        LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        LEFT JOIN productos prod ON (
          (pa.tipo_objetivo = 'producto' AND pa.id_producto = prod.id_producto) OR
          (pa.tipo_objetivo = 'categoria' AND prod.categoria = pa.id_categoria) OR
          (pa.tipo_objetivo = 'todos')
        )
        LEFT JOIN variantes v ON prod.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        WHERE p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
          AND prod.activo = true
        ORDER BY p.fecha_creacion DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;

    } catch (error) {
      console.error('Error en getHomepagePromotions:', error);
      throw error;
    }
  }

  // Obtener productos aplicables a una promoción específica
  static async getPromotionProducts(id_promocion, limit = 10) {
    try {
      const query = `
        SELECT DISTINCT
          prod.id_producto,
          prod.nombre,
          prod.categoria,
          prod.marca,
          COALESCE(stock_precios.precio_min, 0) as precio,
          NULL as precio_original,
          NULL as descuento_actual,
          iv.url as imagen_principal,
          iv.public_id as imagen_public_id
        FROM promociones p
        JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        JOIN productos prod ON (
          (pa.tipo_objetivo = 'producto' AND pa.id_producto = prod.id_producto) OR
          (pa.tipo_objetivo = 'categoria' AND prod.categoria = pa.id_categoria) OR
          (pa.tipo_objetivo = 'todos')
        )
        JOIN variantes v ON prod.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio_min
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        WHERE p.id_promocion = $1
          AND p.activo = true
          AND prod.activo = true
        ORDER BY stock_precios.precio_min ASC
        LIMIT $2
      `;

      const result = await db.query(query, [id_promocion, limit]);
      return result.rows;

    } catch (error) {
      console.error('Error en getPromotionProducts:', error);
      throw error;
    }
  }

  // Obtener promociones por categoría con imágenes
  static async getPromotionsByCategory(categoria) {
    try {
      const query = `
        SELECT DISTINCT
          p.*,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN 
              json_build_object(
                'porcentaje', COALESCE(pp.porcentaje, 0)
              )
          END as detalles,
          iv.url as imagen_ejemplo,
          iv.public_id as imagen_public_id,
          prod.nombre as producto_ejemplo
        FROM promociones p
        LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        LEFT JOIN productos prod ON (
          (pa.tipo_objetivo = 'producto' AND pa.id_producto = prod.id_producto) OR
          (pa.tipo_objetivo = 'categoria' AND prod.categoria = pa.id_categoria) OR
          (pa.tipo_objetivo = 'todos')
        )
        LEFT JOIN variantes v ON prod.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        WHERE p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
          AND (pa.tipo_objetivo = 'todos' OR 
               (pa.tipo_objetivo = 'categoria' AND pa.id_categoria = $1))
          AND prod.activo = true
        ORDER BY p.fecha_creacion DESC
      `;

      const result = await db.query(query, [categoria]);
      return result.rows;

    } catch (error) {
      console.error('Error en getPromotionsByCategory:', error);
      throw error;
    }
  }
}

module.exports = PromotionModel;
