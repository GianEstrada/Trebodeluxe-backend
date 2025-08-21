const db = require('../config/db');

/**
 * Modelo de Promociones
 * Maneja todas las operaciones relacionadas con promociones, descuentos y ofertas especiales
 */
class PromotionModel {

  /**
   * Obtener promociones activas simples (sin JOINs complejos)
   * Endpoint público para mostrar promociones generales
   */
  static async getActiveSimple() {
    try {
      const query = `
        SELECT 
          id_promocion,
          nombre,
          tipo,
          fecha_inicio,
          fecha_fin,
          activo
        FROM promociones
        WHERE activo = true
          AND fecha_inicio <= NOW()
          AND fecha_fin >= NOW()
        ORDER BY id_promocion DESC
        LIMIT 10
      `;
      
      const result = await db.query(query);
      console.log(`✅ Promociones activas simples encontradas: ${result.rows.length}`);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error en getActiveSimple:', error);
      return [];
    }
  }

  /**
   * Obtener promociones específicas para un producto
   * Implementa sistema de prioridades: producto específico > categoría > general
   */
  static async getPromotionsForProduct(productId, categoria = null) {
    try {
      console.log(`🎯 Buscando promociones para producto ${productId}, categoría: ${categoria}`);
      
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.activo,
          p.fecha_inicio,
          p.fecha_fin,
          COALESCE(pp.porcentaje_descuento, 0) as valor_descuento,
          'porcentaje' as tipo_promocion,
          CASE 
            WHEN pa.aplica_a = 'todos' THEN 'todos'
            WHEN pa.aplica_a = 'categoria' THEN 'categoria'
            WHEN pa.aplica_a = 'producto' THEN 'producto_especifico'
            ELSE 'todos'
          END as aplicable_a,
          pa.id_producto as producto_id,
          pa.id_categoria,
          CASE 
            WHEN pa.id_categoria::text = '1' OR LOWER(pa.id_categoria::text) = 'playeras' THEN 'Playeras'
            WHEN pa.id_categoria::text = '2' OR LOWER(pa.id_categoria::text) = 'hoodies' OR LOWER(pa.id_categoria::text) = 'hoodie' THEN 'Hoodies'
            WHEN pa.id_categoria::text = '3' OR LOWER(pa.id_categoria::text) = 'pantalones' THEN 'Pantalones'
            WHEN pa.id_categoria::text = '4' OR LOWER(pa.id_categoria::text) = 'zapatos' THEN 'Zapatos'
            WHEN pa.id_categoria::text = '5' OR LOWER(pa.id_categoria::text) = 'accesorios' THEN 'Accesorios'
            WHEN pa.id_categoria::text = '6' OR LOWER(pa.id_categoria::text) = 'goodies' THEN 'Goodies'
            ELSE pa.id_categoria::text
          END as categoria,
          -- Prioridad: 1=Producto específico, 2=Categoría, 3=General
          CASE 
            WHEN pa.aplica_a = 'producto' AND pa.id_producto = $1 THEN 1
            WHEN pa.aplica_a = 'categoria' AND (
              pa.id_categoria::text = $2 OR 
              LOWER(pa.id_categoria::text) = LOWER($2) OR
              (LOWER($2) = 'hoodie' AND LOWER(pa.id_categoria::text) = 'hoodies') OR
              (LOWER($2) = 'hoodies' AND LOWER(pa.id_categoria::text) = 'hoodie')
            ) THEN 2
            WHEN pa.aplica_a = 'todos' THEN 3
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
            pa.aplica_a = 'todos' OR
            -- Promociones por producto específico
            (pa.aplica_a = 'producto' AND pa.id_producto = $1) OR
            -- Promociones por categoría (múltiples variantes)
            (pa.aplica_a = 'categoria' AND (
              pa.id_categoria::text = $2 OR 
              LOWER(pa.id_categoria::text) = LOWER($2) OR
              (LOWER($2) = 'hoodie' AND LOWER(pa.id_categoria::text) = 'hoodies') OR
              (LOWER($2) = 'hoodies' AND LOWER(pa.id_categoria::text) = 'hoodie') OR
              (LOWER($2) = 'playeras' AND pa.id_categoria::text = '1') OR
              (LOWER($2) = 'goodies' AND pa.id_categoria::text = '6')
            ))
          )
        ORDER BY 
          prioridad ASC,  -- Producto específico primero, luego categoría, luego general
          COALESCE(pp.porcentaje_descuento, 0) DESC
        LIMIT 5
      `;
      
      const result = await db.query(query, [productId, categoria]);
      
      console.log(`🎯 Promociones encontradas para producto ${productId}: ${result.rows.length}`);
      result.rows.forEach(promo => {
        console.log(`  - ${promo.nombre}: ${promo.valor_descuento}% (${promo.aplicable_a}, prioridad: ${promo.prioridad})`);
      });
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error en getPromotionsForProduct:', error);
      return [];
    }
  }

  /**
   * Función de debug detallada para diagnosticar problemas de BD
   * Verifica estructura de tablas y datos existentes
   */
  static async debugAllPromotions() {
    try {
      console.log('🔍 === INICIANDO DEBUG DE PROMOCIONES ===');
      
      // Verificar estructura exacta de promo_porcentaje
      const columnsQuery = `
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns 
        WHERE table_name = 'promo_porcentaje' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await db.query(columnsQuery);
      console.log('🏗️ Estructura de tabla promo_porcentaje:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.numeric_precision || 'N/A'}${row.numeric_scale ? ',' + row.numeric_scale : ''})`);
      });
      
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
      
      // Consulta simple de promociones base
      const promocionesQuery = `
        SELECT id_promocion, nombre, tipo, activo, fecha_inicio, fecha_fin
        FROM promociones
        ORDER BY id_promocion
      `;
      
      const result = await db.query(promocionesQuery);
      console.log(`📈 Total promociones base: ${result.rows.length}`);
      
      // Verificar promociones con porcentajes - probando ambos nombres de columna
      console.log('🧪 Probando diferentes nombres de columna...');
      
      try {
        const porcentajeQuery1 = `
          SELECT p.id_promocion, p.nombre, pp.porcentaje_descuento as porcentaje
          FROM promociones p
          LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
          WHERE p.activo = true
          LIMIT 3
        `;
        
        const porcentajeResult1 = await db.query(porcentajeQuery1);
        console.log(`✅ Con 'porcentaje_descuento': ${porcentajeResult1.rows.length} resultados`);
        porcentajeResult1.rows.forEach(row => {
          console.log(`  - ${row.nombre}: ${row.porcentaje}% (tipo: ${typeof row.porcentaje})`);
        });
      } catch (err) {
        console.log('❌ Error con porcentaje_descuento:', err.message);
      }
      
      try {
        const porcentajeQuery2 = `
          SELECT p.id_promocion, p.nombre, pp.porcentaje as porcentaje
          FROM promociones p
          LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
          WHERE p.activo = true
          LIMIT 3
        `;
        
        const porcentajeResult2 = await db.query(porcentajeQuery2);
        console.log(`✅ Con 'porcentaje': ${porcentajeResult2.rows.length} resultados`);
        porcentajeResult2.rows.forEach(row => {
          console.log(`  - ${row.nombre}: ${row.porcentaje}% (tipo: ${typeof row.porcentaje})`);
        });
      } catch (err) {
        console.log('❌ Error con porcentaje:', err.message);
      }
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error en debugAllPromotions:', error);
      return [];
    }
  }

  /**
   * Obtener todas las promociones activas con detalles completos
   * Para uso en admin o listados completos
   */
  static async getAllActive() {
    try {
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.fecha_inicio,
          p.fecha_fin,
          p.activo,
          p.uso_maximo,
          p.veces_usado,
          COALESCE(pp.porcentaje_descuento, 0) as porcentaje,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN
              json_build_object('porcentaje', COALESCE(pp.porcentaje_descuento, 0))
            WHEN p.tipo = 'codigo' THEN
              json_build_object(
                'codigo', pc.codigo,
                'descuento', pc.descuento,
                'tipo_descuento', pc.tipo_descuento
              )
          END as detalles,
          array_agg(
            DISTINCT json_build_object(
              'aplica_a', pa.aplica_a,
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
        GROUP BY p.id_promocion, p.nombre, p.tipo, p.fecha_inicio, p.fecha_fin, p.activo,
                 p.uso_maximo, p.veces_usado,
                 pxy.cantidad_comprada, pxy.cantidad_pagada, 
                 pp.porcentaje_descuento, pc.codigo, pc.descuento, pc.tipo_descuento
        ORDER BY p.fecha_inicio DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error en getAllActive promociones:', error);
      // Fallback a consulta simple en caso de error
      return await this.getActiveSimple();
    }
  }

  /**
   * Obtener TODAS las promociones (activas e inactivas) para admin panel
   * Incluye el campo porcentaje directamente accesible
   */
  static async getAll() {
    try {
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.fecha_inicio,
          p.fecha_fin,
          p.activo,
          p.uso_maximo,
          p.veces_usado,
          COALESCE(pp.porcentaje_descuento, 0) as porcentaje,
          CASE 
            WHEN p.tipo = 'x_por_y' THEN 
              json_build_object(
                'cantidad_comprada', pxy.cantidad_comprada,
                'cantidad_pagada', pxy.cantidad_pagada
              )
            WHEN p.tipo = 'porcentaje' THEN
              json_build_object('porcentaje', COALESCE(pp.porcentaje_descuento, 0))
            WHEN p.tipo = 'codigo' THEN
              json_build_object(
                'codigo', pc.codigo,
                'descuento', pc.descuento,
                'tipo_descuento', pc.tipo_descuento
              )
          END as detalles,
          array_agg(
            DISTINCT json_build_object(
              'aplica_a', pa.aplica_a,
              'id_categoria', pa.id_categoria,
              'id_producto', pa.id_producto
            )
          ) FILTER (WHERE pa.id_aplicacion IS NOT NULL) as aplicaciones
        FROM promociones p
        LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        GROUP BY p.id_promocion, p.nombre, p.tipo, p.fecha_inicio, p.fecha_fin, p.activo,
                 p.uso_maximo, p.veces_usado,
                 pxy.cantidad_comprada, pxy.cantidad_pagada, 
                 pp.porcentaje_descuento, pc.codigo, pc.descuento, pc.tipo_descuento
        ORDER BY p.fecha_inicio DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error en getAll promociones:', error);
      // Fallback a consulta simple en caso de error
      return await this.getActiveSimple();
    }
  }

  /**
   * Crear una nueva promoción
   * Maneja la creación de promoción base y sus detalles específicos
   */
  static async create(promotionData) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insertar promoción base
      const promotionQuery = `
        INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, uso_maximo, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_promocion
      `;
      
      const promotionResult = await client.query(promotionQuery, [
        promotionData.nombre,
        promotionData.tipo,
        promotionData.fecha_inicio,
        promotionData.fecha_fin,
        promotionData.uso_maximo || null,
        promotionData.activo !== false
      ]);
      
      const promotionId = promotionResult.rows[0].id_promocion;
      
      // Insertar detalles específicos según el tipo
      if (promotionData.tipo === 'porcentaje' && promotionData.porcentaje) {
        await client.query(
          'INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, $2)',
          [promotionId, promotionData.porcentaje]
        );
      }
      
      if (promotionData.tipo === 'x_por_y' && promotionData.cantidad_comprada && promotionData.cantidad_pagada) {
        await client.query(
          'INSERT INTO promo_x_por_y (id_promocion, cantidad_comprada, cantidad_pagada) VALUES ($1, $2, $3)',
          [promotionId, promotionData.cantidad_comprada, promotionData.cantidad_pagada]
        );
      }
      
      if (promotionData.tipo === 'codigo' && promotionData.codigo && promotionData.descuento) {
        await client.query(
          'INSERT INTO promo_codigo (id_promocion, codigo, descuento, tipo_descuento) VALUES ($1, $2, $3, $4)',
          [promotionId, promotionData.codigo, promotionData.descuento, promotionData.tipo_descuento || 'porcentaje']
        );
      }
      
      // Insertar aplicaciones (a qué productos/categorías se aplica)
      if (promotionData.aplicaciones && Array.isArray(promotionData.aplicaciones)) {
        for (const aplicacion of promotionData.aplicaciones) {
          await client.query(
            'INSERT INTO promocion_aplicacion (id_promocion, aplica_a, id_categoria, id_producto) VALUES ($1, $2, $3, $4)',
            [promotionId, aplicacion.aplica_a, aplicacion.id_categoria || null, aplicacion.id_producto || null]
          );
        }
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Promoción creada exitosamente: ID ${promotionId}`);
      return { id_promocion: promotionId, ...promotionData };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creando promoción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtener promoción por ID con todos los detalles
   */
  static async getById(id) {
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
              json_build_object('porcentaje', COALESCE(pp.porcentaje_descuento, 0))
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
        WHERE p.id_promocion = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      // Obtener aplicaciones
      const aplicacionesQuery = `
        SELECT aplica_a, id_categoria, id_producto
        FROM promocion_aplicacion
        WHERE id_promocion = $1
      `;
      
      const aplicacionesResult = await db.query(aplicacionesQuery, [id]);
      
      const promotion = result.rows[0];
      promotion.aplicaciones = aplicacionesResult.rows;
      
      return promotion;
      
    } catch (error) {
      console.error('❌ Error obteniendo promoción por ID:', error);
      throw error;
    }
  }

  /**
   * Actualizar una promoción existente
   */
  static async update(id, promotionData) {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar datos base
      const updateQuery = `
        UPDATE promociones 
        SET nombre = $1, fecha_inicio = $2, fecha_fin = $3, 
            uso_maximo = $4, activo = $5
        WHERE id_promocion = $6
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [
        promotionData.nombre,
        promotionData.fecha_inicio,
        promotionData.fecha_fin,
        promotionData.uso_maximo,
        promotionData.activo,
        id
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Promoción no encontrada');
      }
      
      // Actualizar detalles específicos según tipo
      const promocion = result.rows[0];
      
      if (promocion.tipo === 'porcentaje' && promotionData.porcentaje !== undefined) {
        await client.query(
          `INSERT INTO promo_porcentaje (id_promocion, porcentaje) 
           VALUES ($1, $2) 
           ON CONFLICT (id_promocion) 
           DO UPDATE SET porcentaje = $2`,
          [id, promotionData.porcentaje]
        );
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ Promoción actualizada: ID ${id}`);
      return await this.getById(id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error actualizando promoción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Eliminar promoción
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM promociones WHERE id_promocion = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Promoción no encontrada');
      }
      
      console.log(`✅ Promoción eliminada: ID ${id}`);
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error eliminando promoción:', error);
      throw error;
    }
  }

  /**
   * Validar código promocional
   */
  static async validateCode(codigo) {
    try {
      const query = `
        SELECT p.*, pc.descuento, pc.tipo_descuento
        FROM promociones p
        JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        WHERE pc.codigo = $1 
          AND p.activo = true
          AND p.fecha_inicio <= NOW()
          AND p.fecha_fin >= NOW()
          AND (p.uso_maximo IS NULL OR p.veces_usado < p.uso_maximo)
      `;
      
      const result = await db.query(query, [codigo]);
      
      if (result.rows.length === 0) {
        return { valid: false, message: 'Código no válido o expirado' };
      }
      
      return {
        valid: true,
        promotion: result.rows[0],
        message: 'Código válido'
      };
      
    } catch (error) {
      console.error('❌ Error validando código:', error);
      return { valid: false, message: 'Error validando código' };
    }
  }

  /**
   * Obtener promociones para la página principal
   */
  static async getHomepagePromotions(limit = 5) {
    try {
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.fecha_inicio,
          p.fecha_fin,
          json_build_object(
            'porcentaje', COALESCE(pp.porcentaje_descuento, 0)
          ) as detalles
        FROM promociones p
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        WHERE p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
        ORDER BY p.fecha_inicio DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error obteniendo promociones del homepage:', error);
      return [];
    }
  }

  /**
   * Obtener promociones por categoría
   */
  static async getPromotionsByCategory(categoria) {
    try {
      const query = `
        SELECT 
          p.id_promocion,
          p.nombre,
          p.tipo,
          p.fecha_inicio,
          p.fecha_fin,
          json_build_object(
            'porcentaje', COALESCE(pp.porcentaje_descuento, 0)
          ) as detalles,
          pa.aplica_a,
          pa.id_categoria
        FROM promociones p
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
        WHERE p.activo = true 
          AND p.fecha_inicio <= NOW() 
          AND p.fecha_fin >= NOW()
          AND (
            pa.aplica_a = 'todos' OR
            (pa.aplica_a = 'categoria' AND (
              pa.id_categoria::text = $1 OR 
              LOWER(pa.id_categoria::text) = LOWER($1)
            ))
          )
        ORDER BY p.fecha_inicio DESC
      `;
      
      const result = await db.query(query, [categoria]);
      return result.rows;
      
    } catch (error) {
      console.error('❌ Error obteniendo promociones por categoría:', error);
      return [];
    }
  }

}

module.exports = PromotionModel;
