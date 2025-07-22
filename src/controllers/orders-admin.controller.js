// orders-admin.controller.js - Controlador para gestión administrativa de pedidos

const db = require('../config/db');

class OrdersAdminController {
  
  // ===== OBTENER PEDIDOS =====
  
  // Obtener todos los pedidos con filtros y búsqueda
  static async getAllOrders(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        estado = null, 
        search = null,
        fecha_desde = null,
        fecha_hasta = null,
        sort_by = 'fecha_creacion',
        sort_order = 'desc'
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      const params = [];
      let paramCount = 1;
      
      // Filtro por estado
      if (estado) {
        whereClause += ` WHERE p.estado = $${paramCount++}`;
        params.push(estado);
      }
      
      // Búsqueda por ID de pedido, nombre de cliente o correo
      if (search) {
        const searchCondition = `
          (p.id_pedido::text ILIKE $${paramCount} 
           OR u.nombres ILIKE $${paramCount} 
           OR u.apellidos ILIKE $${paramCount}
           OR u.correo ILIKE $${paramCount}
           OR ie.nombre_completo ILIKE $${paramCount})
        `;
        whereClause += whereClause ? ` AND ${searchCondition}` : ` WHERE ${searchCondition}`;
        params.push(`%${search}%`);
        paramCount++;
      }
      
      // Filtro por rango de fechas
      if (fecha_desde) {
        const dateCondition = `p.fecha_creacion >= $${paramCount++}`;
        whereClause += whereClause ? ` AND ${dateCondition}` : ` WHERE ${dateCondition}`;
        params.push(fecha_desde);
      }
      
      if (fecha_hasta) {
        const dateCondition = `p.fecha_creacion <= $${paramCount++}`;
        whereClause += whereClause ? ` AND ${dateCondition}` : ` WHERE ${dateCondition}`;
        params.push(fecha_hasta + ' 23:59:59');
      }
      
      // Validar parámetros de ordenamiento
      const validSortFields = ['fecha_creacion', 'id_pedido', 'total', 'estado'];
      const validSortOrders = ['asc', 'desc'];
      
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'fecha_creacion';
      const sortDirection = validSortOrders.includes(sort_order.toLowerCase()) ? sort_order.toUpperCase() : 'DESC';
      
      const query = `
        SELECT 
          p.*,
          u.nombres as cliente_nombres,
          u.apellidos as cliente_apellidos,
          u.correo as cliente_correo,
          ie.nombre_completo as direccion_nombre,
          ie.telefono as direccion_telefono,
          ie.ciudad as direccion_ciudad,
          ie.estado as direccion_estado,
          me.nombre as metodo_envio_nombre,
          mp.nombre as metodo_pago_nombre,
          COUNT(*) OVER() as total_count,
          (
            SELECT COUNT(pd.id_detalle) 
            FROM pedido_detalle pd 
            WHERE pd.id_pedido = p.id_pedido
          ) as total_items
        FROM pedidos p
        LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
        LEFT JOIN informacion_envio ie ON p.id_informacion_envio = ie.id_informacion
        LEFT JOIN metodos_envio me ON p.id_metodo_envio = me.id_metodo_envio
        LEFT JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
        ${whereClause}
        ORDER BY p.${sortField} ${sortDirection}
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;
      
      params.push(limit, offset);
      const result = await db.pool.query(query, params);
      
      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        success: true,
        data: result.rows.map(row => {
          const { total_count, ...order } = row;
          return order;
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: totalCount,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error obteniendo pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== OBTENER PEDIDO ESPECÍFICO =====
  
  // Obtener pedido por ID con todos sus detalles
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      
      // Obtener información principal del pedido
      const orderQuery = `
        SELECT 
          p.*,
          u.nombres as cliente_nombres,
          u.apellidos as cliente_apellidos,
          u.correo as cliente_correo,
          u.usuario as cliente_usuario,
          ie.nombre_completo,
          ie.telefono,
          ie.direccion,
          ie.ciudad,
          ie.estado as direccion_estado,
          ie.codigo_postal,
          ie.pais,
          me.nombre as metodo_envio_nombre,
          me.descripcion as metodo_envio_descripcion,
          mp.nombre as metodo_pago_nombre,
          mp.descripcion as metodo_pago_descripcion
        FROM pedidos p
        LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
        LEFT JOIN informacion_envio ie ON p.id_informacion_envio = ie.id_informacion
        LEFT JOIN metodos_envio me ON p.id_metodo_envio = me.id_metodo_envio
        LEFT JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
        WHERE p.id_pedido = $1
      `;
      
      // Obtener detalles del pedido (productos)
      const detailsQuery = `
        SELECT 
          pd.*,
          pr.nombre as producto_nombre,
          pr.categoria as producto_categoria,
          v.nombre as variante_nombre,
          v.precio as variante_precio,
          t.nombre_talla,
          st.nombre as sistema_talla
        FROM pedido_detalle pd
        JOIN productos pr ON pd.id_producto = pr.id_producto
        JOIN variantes v ON pd.id_variante = v.id_variante
        LEFT JOIN tallas t ON pd.id_talla = t.id_talla
        LEFT JOIN sistemas_talla st ON t.id_sistema_talla = st.id_sistema_talla
        WHERE pd.id_pedido = $1
        ORDER BY pd.id_detalle
      `;
      
      const [orderResult, detailsResult] = await Promise.all([
        db.pool.query(orderQuery, [id]),
        db.pool.query(detailsQuery, [id])
      ]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      const order = orderResult.rows[0];
      order.detalles = detailsResult.rows;
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error obteniendo pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== ACTUALIZAR PEDIDO =====
  
  // Actualizar estado y/o notas del pedido
  static async updateOrder(req, res) {
    try {
      const { id } = req.params;
      const { estado, notas } = req.body;
      
      // Validar estado si se proporciona
      const validStates = ['pendiente', 'procesando', 'en_espera', 'enviado', 'terminado', 'problema'];
      if (estado && !validStates.includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido. Estados permitidos: ' + validStates.join(', ')
        });
      }
      
      // Construir query de actualización dinámicamente
      let updateFields = [];
      let params = [];
      let paramCount = 1;
      
      if (estado) {
        updateFields.push(`estado = $${paramCount++}`);
        params.push(estado);
      }
      
      if (notas !== undefined) {
        updateFields.push(`notas = $${paramCount++}`);
        params.push(notas);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }
      
      params.push(id); // ID va al final
      
      const updateQuery = `
        UPDATE pedidos 
        SET ${updateFields.join(', ')}
        WHERE id_pedido = $${paramCount}
        RETURNING *
      `;
      
      const result = await db.pool.query(updateQuery, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Pedido actualizado correctamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error actualizando pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
  
  // ===== ESTADÍSTICAS =====
  
  // Obtener estadísticas de pedidos
  static async getOrdersStats(req, res) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_pedidos,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'procesando' THEN 1 END) as procesando,
          COUNT(CASE WHEN estado = 'en_espera' THEN 1 END) as en_espera,
          COUNT(CASE WHEN estado = 'enviado' THEN 1 END) as enviados,
          COUNT(CASE WHEN estado = 'terminado' THEN 1 END) as terminados,
          COUNT(CASE WHEN estado = 'problema' THEN 1 END) as problemas,
          COALESCE(SUM(total), 0) as ingresos_totales,
          COALESCE(AVG(total), 0) as ticket_promedio,
          COUNT(CASE WHEN fecha_creacion >= CURRENT_DATE THEN 1 END) as pedidos_hoy,
          COUNT(CASE WHEN fecha_creacion >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as pedidos_semana
        FROM pedidos
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
}

module.exports = OrdersAdminController;
