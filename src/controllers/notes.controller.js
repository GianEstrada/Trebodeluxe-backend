// notes.controller.js - Controlador para gestión de notas generales

const db = require('../config/db');

class NotesController {
  
  // ===== OBTENER NOTAS =====
  
  // Obtener todas las notas con filtros y búsqueda
  static async getAllNotes(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        prioridad = null, 
        search = null,
        activo = true,
        fecha_desde = null,
        fecha_hasta = null,
        vencidas = null,
        etiqueta = null,
        sort_by = 'fecha_creacion',
        sort_order = 'desc'
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      let whereConditions = [];
      const params = [];
      let paramCount = 1;
      
      // Filtro por activo
      if (activo !== null) {
        whereConditions.push(`n.activo = $${paramCount++}`);
        params.push(activo === 'true');
      }
      
      // Filtro por prioridad
      if (prioridad) {
        whereConditions.push(`n.prioridad = $${paramCount++}`);
        params.push(prioridad);
      }
      
      // Búsqueda en título, contenido o nombre de usuario
      if (search) {
        whereConditions.push(`
          (n.titulo ILIKE $${paramCount} 
           OR n.contenido ILIKE $${paramCount}
           OR n.nombre_usuario_creador ILIKE $${paramCount})
        `);
        params.push(`%${search}%`);
        paramCount++;
      }
      
      // Filtro por rango de fechas
      if (fecha_desde) {
        whereConditions.push(`n.fecha_creacion >= $${paramCount++}`);
        params.push(fecha_desde);
      }
      
      if (fecha_hasta) {
        whereConditions.push(`n.fecha_creacion <= $${paramCount++}`);
        params.push(fecha_hasta + ' 23:59:59');
      }
      
      // Filtro por notas vencidas
      if (vencidas === 'true') {
        whereConditions.push('n.fecha_vencimiento < CURRENT_TIMESTAMP AND n.fecha_vencimiento IS NOT NULL');
      } else if (vencidas === 'false') {
        whereConditions.push('(n.fecha_vencimiento >= CURRENT_TIMESTAMP OR n.fecha_vencimiento IS NULL)');
      }
      
      // Filtro por etiqueta
      if (etiqueta) {
        whereConditions.push(`$${paramCount++} = ANY(n.etiquetas)`);
        params.push(etiqueta);
      }
      
      // Construir WHERE clause
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Validar parámetros de ordenamiento
      const validSortFields = ['fecha_creacion', 'fecha_actualizacion', 'prioridad', 'titulo', 'fecha_vencimiento'];
      const validSortOrders = ['asc', 'desc'];
      
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'fecha_creacion';
      const sortDirection = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : 'DESC';
      
      const query = `
        SELECT 
          n.*,
          u.nombres as usuario_actual_nombres,
          u.apellidos as usuario_actual_apellidos,
          CASE 
            WHEN n.fecha_vencimiento < CURRENT_TIMESTAMP AND n.fecha_vencimiento IS NOT NULL 
            THEN true 
            ELSE false 
          END as vencida,
          COUNT(*) OVER() as total_count
        FROM notas_generales n
        LEFT JOIN usuarios u ON n.id_usuario_creador = u.id_usuario
        ${whereClause}
        ORDER BY 
          CASE WHEN n.prioridad = 'urgente' THEN 1
               WHEN n.prioridad = 'alta' THEN 2
               WHEN n.prioridad = 'normal' THEN 3
               WHEN n.prioridad = 'baja' THEN 4
               ELSE 5 
          END,
          n.${sortField} ${sortDirection}
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;
      
      params.push(limit, offset);
      const result = await db.pool.query(query, params);
      
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        success: true,
        data: result.rows.map(row => {
          const { total_count, ...note } = row;
          return note;
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: totalCount,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error obteniendo notas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== OBTENER NOTA ESPECÍFICA =====
  
  // Obtener nota por ID
  static async getNoteById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          n.*,
          u.nombres as usuario_actual_nombres,
          u.apellidos as usuario_actual_apellidos,
          CASE 
            WHEN n.fecha_vencimiento < CURRENT_TIMESTAMP AND n.fecha_vencimiento IS NOT NULL 
            THEN true 
            ELSE false 
          END as vencida
        FROM notas_generales n
        LEFT JOIN usuarios u ON n.id_usuario_creador = u.id_usuario
        WHERE n.id_nota = $1
      `;
      
      const result = await db.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nota no encontrada'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error obteniendo nota:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== CREAR NOTA =====
  
  // Crear nueva nota
  static async createNote(req, res) {
    try {
      const { 
        titulo, 
        contenido, 
        prioridad = 'normal', 
        fecha_vencimiento = null,
        etiquetas = [],
        color = 'default',
        // Simulamos datos de usuario (en producción vendrían del middleware de auth)
        id_usuario_creador = 1,
        nombre_usuario_creador = 'Admin User',
        rol_usuario_creador = 'admin'
      } = req.body;
      
      // Validaciones
      if (!titulo || !contenido) {
        return res.status(400).json({
          success: false,
          message: 'Título y contenido son requeridos'
        });
      }
      
      const validPriorities = ['baja', 'normal', 'alta', 'urgente'];
      if (!validPriorities.includes(prioridad)) {
        return res.status(400).json({
          success: false,
          message: 'Prioridad no válida. Valores permitidos: ' + validPriorities.join(', ')
        });
      }
      
      const query = `
        INSERT INTO notas_generales 
        (titulo, contenido, prioridad, id_usuario_creador, nombre_usuario_creador, 
         rol_usuario_creador, fecha_vencimiento, etiquetas, color)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const params = [
        titulo, 
        contenido, 
        prioridad, 
        id_usuario_creador,
        nombre_usuario_creador,
        rol_usuario_creador,
        fecha_vencimiento,
        etiquetas,
        color
      ];
      
      const result = await db.pool.query(query, params);
      
      res.status(201).json({
        success: true,
        message: 'Nota creada correctamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creando nota:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== ACTUALIZAR NOTA =====
  
  // Actualizar nota existente
  static async updateNote(req, res) {
    try {
      const { id } = req.params;
      const { 
        titulo, 
        contenido, 
        prioridad, 
        fecha_vencimiento,
        etiquetas,
        color,
        activo
      } = req.body;
      
      // Construir query de actualización dinámicamente
      let updateFields = [];
      let params = [];
      let paramCount = 1;
      
      if (titulo !== undefined) {
        updateFields.push(`titulo = $${paramCount++}`);
        params.push(titulo);
      }
      
      if (contenido !== undefined) {
        updateFields.push(`contenido = $${paramCount++}`);
        params.push(contenido);
      }
      
      if (prioridad !== undefined) {
        const validPriorities = ['baja', 'normal', 'alta', 'urgente'];
        if (!validPriorities.includes(prioridad)) {
          return res.status(400).json({
            success: false,
            message: 'Prioridad no válida. Valores permitidos: ' + validPriorities.join(', ')
          });
        }
        updateFields.push(`prioridad = $${paramCount++}`);
        params.push(prioridad);
      }
      
      if (fecha_vencimiento !== undefined) {
        updateFields.push(`fecha_vencimiento = $${paramCount++}`);
        params.push(fecha_vencimiento);
      }
      
      if (etiquetas !== undefined) {
        updateFields.push(`etiquetas = $${paramCount++}`);
        params.push(etiquetas);
      }
      
      if (color !== undefined) {
        updateFields.push(`color = $${paramCount++}`);
        params.push(color);
      }
      
      if (activo !== undefined) {
        updateFields.push(`activo = $${paramCount++}`);
        params.push(activo);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }
      
      params.push(id); // ID va al final
      
      const updateQuery = `
        UPDATE notas_generales 
        SET ${updateFields.join(', ')}
        WHERE id_nota = $${paramCount}
        RETURNING *
      `;
      
      const result = await db.pool.query(updateQuery, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nota no encontrada'
        });
      }
      
      res.json({
        success: true,
        message: 'Nota actualizada correctamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error actualizando nota:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== ELIMINAR NOTA =====
  
  // Eliminar nota (soft delete)
  static async deleteNote(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        UPDATE notas_generales 
        SET activo = false
        WHERE id_nota = $1
        RETURNING id_nota, titulo
      `;
      
      const result = await db.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Nota no encontrada'
        });
      }
      
      res.json({
        success: true,
        message: 'Nota eliminada correctamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error eliminando nota:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== ESTADÍSTICAS =====
  
  // Obtener estadísticas de notas
  static async getNotesStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_notas,
          COUNT(CASE WHEN activo = true THEN 1 END) as notas_activas,
          COUNT(CASE WHEN prioridad = 'urgente' THEN 1 END) as urgentes,
          COUNT(CASE WHEN prioridad = 'alta' THEN 1 END) as altas,
          COUNT(CASE WHEN prioridad = 'normal' THEN 1 END) as normales,
          COUNT(CASE WHEN prioridad = 'baja' THEN 1 END) as bajas,
          COUNT(CASE WHEN fecha_vencimiento < CURRENT_TIMESTAMP AND fecha_vencimiento IS NOT NULL AND activo = true THEN 1 END) as vencidas,
          COUNT(CASE WHEN fecha_creacion >= CURRENT_DATE THEN 1 END) as notas_hoy,
          COUNT(CASE WHEN fecha_creacion >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as notas_semana,
          COUNT(CASE WHEN fecha_vencimiento BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days' AND activo = true THEN 1 END) as vencen_pronto
        FROM notas_generales
      `;
      
      const result = await db.pool.query(statsQuery);
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // ===== ETIQUETAS =====
  
  // Obtener todas las etiquetas únicas
  static async getAllTags(req, res) {
    try {
      const query = `
        SELECT DISTINCT unnest(etiquetas) as etiqueta
        FROM notas_generales
        WHERE activo = true AND etiquetas IS NOT NULL
        ORDER BY etiqueta
      `;
      
      const result = await db.pool.query(query);
      
      res.json({
        success: true,
        data: result.rows.map(row => row.etiqueta)
      });
    } catch (error) {
      console.error('Error obteniendo etiquetas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = NotesController;
