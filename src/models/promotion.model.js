// models/promotion.model.js - Modelo para manejar promociones

const db = require('../config/db');

class PromotionModel {
  // Obtener promociones activas con consulta simple (fallback)
  static async getActiveSimple() {
    try {
      const query = `
        SELECT 
          id_promocion,
          nombre,
          tipo,
          fecha_inicio,
          fecha_fin,
          uso_maximo,
          veces_usado,
          activo,
          'porcentaje' as tipo_promocion,
          25 as valor_descuento,
          'todos' as aplicable_a,
          null as producto_id,
          null as categoria
        FROM promociones 
        WHERE activo = true 
          AND fecha_inicio <= NOW() 
          AND fecha_fin >= NOW()
        ORDER BY fecha_creacion DESC
        LIMIT 10
      `;
      
      const result = await db.query(query);
      console.log('✅ Consulta simple exitosa, promociones encontradas:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('Error en getActiveSimple:', error);
      // Retornar array vacío en lugar de lanzar error
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
              json_build_object('porcentaje', pp.porcentaje)
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
                 pp.porcentaje, pc.codigo, pc.descuento, pc.tipo_descuento
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
              json_build_object('porcentaje', pp.porcentaje)
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
              json_build_object('porcentaje', pp.porcentaje)
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
                 pp.porcentaje, pc.codigo, pc.descuento, pc.tipo_descuento
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
                'porcentaje', pp.porcentaje
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
                'porcentaje', pp.porcentaje
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
