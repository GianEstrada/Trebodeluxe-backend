// promotions.controller.js - Controlador completo para gestionar promociones

const db = require('../config/db');

class PromotionsController {
  // ===== PROMOCIONES GENERALES =====
  
  // Obtener todas las promociones con paginación
  static async getAllPromotions(req, res) {
    try {
      const { page = 1, limit = 10, active = null, tipo = null } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      const params = [];
      let paramCount = 1;
      
      if (active !== null) {
        whereClause += ` WHERE p.activo = $${paramCount++}`;
        params.push(active === 'true');
      }
      
      if (tipo) {
        whereClause += whereClause ? ` AND p.tipo = $${paramCount++}` : ` WHERE p.tipo = $${paramCount++}`;
        params.push(tipo);
      }
      
      const query = `
        SELECT 
          p.*,
          px.cantidad_comprada,
          px.cantidad_pagada,
          pp.porcentaje,
          pc.codigo,
          pc.descuento,
          pc.tipo_descuento,
          COUNT(*) OVER() as total_count
        FROM promociones p
        LEFT JOIN promo_x_por_y px ON p.id_promocion = px.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        ${whereClause}
        ORDER BY p.fecha_creacion DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;
      
      params.push(limit, offset);
      const result = await db.pool.query(query, params);
      
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        success: true,
        data: result.rows.map(row => {
          const { total_count, ...promo } = row;
          return promo;
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: totalCount,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error obteniendo promociones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener promoción específica por ID
  static async getPromotionById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          p.*,
          px.cantidad_comprada,
          px.cantidad_pagada,
          pp.porcentaje,
          pc.codigo,
          pc.descuento,
          pc.tipo_descuento
        FROM promociones p
        LEFT JOIN promo_x_por_y px ON p.id_promocion = px.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        WHERE p.id_promocion = $1
      `;
      
      const result = await db.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Promoción no encontrada'
        });
      }

      // Obtener aplicaciones de la promoción
      const applicationsQuery = `
        SELECT * FROM promocion_aplicacion 
        WHERE id_promocion = $1
      `;
      const applicationsResult = await db.pool.query(applicationsQuery, [id]);
      
      res.json({
        success: true,
        data: {
          ...result.rows[0],
          applications: applicationsResult.rows
        }
      });
    } catch (error) {
      console.error('Error obteniendo promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear nueva promoción
  static async createPromotion(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        nombre,
        tipo,
        fecha_inicio,
        fecha_fin,
        uso_maximo,
        activo = true,
        // Datos específicos por tipo
        cantidad_comprada,
        cantidad_pagada,
        porcentaje,
        codigo,
        descuento,
        tipo_descuento,
        // Aplicaciones
        applications = []
      } = req.body;

      // Validaciones básicas
      if (!nombre || !tipo || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, tipo, fecha_inicio y fecha_fin son requeridos'
        });
      }

      const validTypes = ['x_por_y', 'porcentaje', 'codigo'];
      if (!validTypes.includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de promoción no válido',
          validTypes
        });
      }

      // Crear promoción base
      const promotionQuery = `
        INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, uso_maximo, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_promocion
      `;
      
      const promotionResult = await client.query(promotionQuery, [
        nombre, tipo, fecha_inicio, fecha_fin, uso_maximo, activo
      ]);
      
      const promotionId = promotionResult.rows[0].id_promocion;

      // Insertar datos específicos según el tipo
      if (tipo === 'x_por_y') {
        if (!cantidad_comprada || !cantidad_pagada) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'cantidad_comprada y cantidad_pagada son requeridos para promociones x_por_y'
          });
        }
        
        await client.query(
          'INSERT INTO promo_x_por_y (id_promocion, cantidad_comprada, cantidad_pagada) VALUES ($1, $2, $3)',
          [promotionId, cantidad_comprada, cantidad_pagada]
        );
      } else if (tipo === 'porcentaje') {
        if (!porcentaje) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'porcentaje es requerido para promociones de porcentaje'
          });
        }
        
        await client.query(
          'INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, $2)',
          [promotionId, porcentaje]
        );
      } else if (tipo === 'codigo') {
        if (!codigo || !descuento || !tipo_descuento) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: 'codigo, descuento y tipo_descuento son requeridos para promociones de código'
          });
        }
        
        await client.query(
          'INSERT INTO promo_codigo (id_promocion, codigo, descuento, tipo_descuento) VALUES ($1, $2, $3, $4)',
          [promotionId, codigo, descuento, tipo_descuento]
        );
      }

      // Insertar aplicaciones
      for (const app of applications) {
        await client.query(
          'INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_categoria, id_producto) VALUES ($1, $2, $3, $4)',
          [promotionId, app.tipo_objetivo, app.id_categoria || null, app.id_producto || null]
        );
      }

      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Promoción creada exitosamente',
        data: { id_promocion: promotionId }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  // Actualizar promoción existente
  static async updatePromotion(req, res) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const {
        nombre,
        tipo,
        fecha_inicio,
        fecha_fin,
        uso_maximo,
        activo,
        // Datos específicos por tipo
        cantidad_comprada,
        cantidad_pagada,
        porcentaje,
        codigo,
        descuento,
        tipo_descuento,
        // Aplicaciones
        applications
      } = req.body;

      // Verificar que la promoción existe
      const checkResult = await client.query(
        'SELECT id_promocion, tipo FROM promociones WHERE id_promocion = $1',
        [id]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Promoción no encontrada'
        });
      }

      const currentType = checkResult.rows[0].tipo;

      // Actualizar promoción base
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (nombre !== undefined) {
        fields.push(`nombre = $${paramCount++}`);
        values.push(nombre);
      }
      if (tipo !== undefined) {
        fields.push(`tipo = $${paramCount++}`);
        values.push(tipo);
      }
      if (fecha_inicio !== undefined) {
        fields.push(`fecha_inicio = $${paramCount++}`);
        values.push(fecha_inicio);
      }
      if (fecha_fin !== undefined) {
        fields.push(`fecha_fin = $${paramCount++}`);
        values.push(fecha_fin);
      }
      if (uso_maximo !== undefined) {
        fields.push(`uso_maximo = $${paramCount++}`);
        values.push(uso_maximo);
      }
      if (activo !== undefined) {
        fields.push(`activo = $${paramCount++}`);
        values.push(activo);
      }

      if (fields.length > 0) {
        values.push(id);
        const updateQuery = `
          UPDATE promociones 
          SET ${fields.join(', ')}
          WHERE id_promocion = $${paramCount}
        `;
        await client.query(updateQuery, values);
      }

      // Si el tipo cambió, limpiar datos del tipo anterior
      const newType = tipo || currentType;
      if (newType !== currentType) {
        await client.query('DELETE FROM promo_x_por_y WHERE id_promocion = $1', [id]);
        await client.query('DELETE FROM promo_porcentaje WHERE id_promocion = $1', [id]);
        await client.query('DELETE FROM promo_codigo WHERE id_promocion = $1', [id]);
      }

      // Actualizar datos específicos según el tipo
      if (newType === 'x_por_y' && (cantidad_comprada !== undefined || cantidad_pagada !== undefined)) {
        await client.query('DELETE FROM promo_x_por_y WHERE id_promocion = $1', [id]);
        if (cantidad_comprada && cantidad_pagada) {
          await client.query(
            'INSERT INTO promo_x_por_y (id_promocion, cantidad_comprada, cantidad_pagada) VALUES ($1, $2, $3)',
            [id, cantidad_comprada, cantidad_pagada]
          );
        }
      } else if (newType === 'porcentaje' && porcentaje !== undefined) {
        await client.query('DELETE FROM promo_porcentaje WHERE id_promocion = $1', [id]);
        await client.query(
          'INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, $2)',
          [id, porcentaje]
        );
      } else if (newType === 'codigo' && (codigo !== undefined || descuento !== undefined)) {
        await client.query('DELETE FROM promo_codigo WHERE id_promocion = $1', [id]);
        if (codigo && descuento && tipo_descuento) {
          await client.query(
            'INSERT INTO promo_codigo (id_promocion, codigo, descuento, tipo_descuento) VALUES ($1, $2, $3, $4)',
            [id, codigo, descuento, tipo_descuento]
          );
        }
      }

      // Actualizar aplicaciones si se proporcionan
      if (applications !== undefined) {
        await client.query('DELETE FROM promocion_aplicacion WHERE id_promocion = $1', [id]);
        
        for (const app of applications) {
          await client.query(
            'INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_categoria, id_producto) VALUES ($1, $2, $3, $4)',
            [id, app.tipo_objetivo, app.id_categoria || null, app.id_producto || null]
          );
        }
      }

      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Promoción actualizada exitosamente'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error actualizando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  // Eliminar promoción (soft delete)
  static async deletePromotion(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        UPDATE promociones 
        SET activo = false
        WHERE id_promocion = $1
        RETURNING id_promocion, nombre
      `;
      
      const result = await db.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Promoción no encontrada'
        });
      }
      
      res.json({
        success: true,
        message: 'Promoción eliminada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error eliminando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener promociones activas para frontend
  static async getActivePromotions(req, res) {
    try {
      const query = `
        SELECT 
          p.*,
          px.cantidad_comprada,
          px.cantidad_pagada,
          pp.porcentaje,
          pc.codigo,
          pc.descuento,
          pc.tipo_descuento
        FROM promociones p
        LEFT JOIN promo_x_por_y px ON p.id_promocion = px.id_promocion
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
        WHERE p.activo = true 
          AND p.fecha_inicio <= CURRENT_TIMESTAMP 
          AND p.fecha_fin >= CURRENT_TIMESTAMP
          AND (p.uso_maximo IS NULL OR p.veces_usado < p.uso_maximo)
        ORDER BY p.fecha_creacion DESC
      `;
      
      const result = await db.pool.query(query);
      
      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Error obteniendo promociones activas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Aplicar promoción (incrementar uso)
  static async applyPromotion(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        UPDATE promociones 
        SET veces_usado = veces_usado + 1
        WHERE id_promocion = $1 
          AND activo = true
          AND fecha_inicio <= CURRENT_TIMESTAMP 
          AND fecha_fin >= CURRENT_TIMESTAMP
          AND (uso_maximo IS NULL OR veces_usado < uso_maximo)
        RETURNING *
      `;
      
      const result = await db.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Promoción no disponible o límite alcanzado'
        });
      }
      
      res.json({
        success: true,
        message: 'Promoción aplicada exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error aplicando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = PromotionsController;
