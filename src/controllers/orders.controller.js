// src/controllers/orders.controller.js - Controlador para gestión de órdenes

class OrdersController {
  
  // Crear nueva orden después del pago exitoso
  static async createOrder(req, res) {
    // Import dependencies inside the method to avoid load-time errors
    const db = require('../config/db');
    const skyDropXService = require('../services/skydropx.service');
    
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        // Datos del carrito
        cartItems,
        // Datos del usuario (puede ser null para anónimos)
        userId = null,
        // Datos de envío
        shippingInfo,
        // Datos del pago
        paymentIntentId,
        paymentStatus = 'succeeded',
        // Datos de costo
        subtotal,
        iva,
        total,
        moneda = 'MXN',
        tasaCambio = 1.0,
        // Datos de envío
        costoEnvio = 0,
        tiempoEntrega = '3-5 días hábiles'
      } = req.body;

      // Validar datos requeridos
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Los items del carrito son requeridos'
        });
      }

      if (!shippingInfo || !shippingInfo.nombre_completo || !shippingInfo.telefono) {
        return res.status(400).json({
          success: false,
          message: 'La información de envío es requerida'
        });
      }

      if (!paymentIntentId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del Payment Intent es requerido'
        });
      }

      // Generar número de referencia único
      const numeroReferencia = `TDX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Insertar información de envío si no existe
      let shippingId;
      if (userId) {
        // Para usuarios autenticados, buscar info de envío existente
        const existingShipping = await client.query(
          'SELECT id_informacion FROM informacion_envio WHERE id_usuario = $1',
          [userId]
        );

        if (existingShipping.rows.length > 0) {
          shippingId = existingShipping.rows[0].id_informacion;
          
          // Actualizar con nueva información si es diferente
          await client.query(`
            UPDATE informacion_envio 
            SET nombre_completo = $1, telefono = $2, direccion = $3, 
                ciudad = $4, estado = $5, codigo_postal = $6, pais = $7,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id_informacion = $8
          `, [
            shippingInfo.nombre_completo,
            shippingInfo.telefono,
            shippingInfo.direccion || '',
            shippingInfo.ciudad || '',
            shippingInfo.estado || '',
            shippingInfo.codigo_postal || '',
            shippingInfo.pais || 'México',
            shippingId
          ]);
        } else {
          // Crear nueva información de envío
          const shippingResult = await client.query(`
            INSERT INTO informacion_envio 
            (id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id_informacion
          `, [
            userId,
            shippingInfo.nombre_completo,
            shippingInfo.telefono,
            shippingInfo.direccion || '',
            shippingInfo.ciudad || '',
            shippingInfo.estado || '',
            shippingInfo.codigo_postal || '',
            shippingInfo.pais || 'México'
          ]);
          shippingId = shippingResult.rows[0].id_informacion;
        }
      } else {
        // Para usuarios anónimos, crear nueva información de envío
        const shippingResult = await client.query(`
          INSERT INTO informacion_envio 
          (nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id_informacion
        `, [
          shippingInfo.nombre_completo,
          shippingInfo.telefono,
          shippingInfo.direccion || '',
          shippingInfo.ciudad || '',
          shippingInfo.estado || '',
          shippingInfo.codigo_postal || '',
          shippingInfo.pais || 'México'
        ]);
        shippingId = shippingResult.rows[0].id_informacion;
      }

      // Crear la orden principal
      const orderResult = await client.query(`
        INSERT INTO ordenes 
        (id_usuario, numero_referencia, id_informacion_envio, 
         subtotal, iva, total, moneda, tasa_cambio, costo_envio, tiempo_entrega,
         payment_intent_id, estado_pago, estado, fecha_creacion)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
        RETURNING id_orden, numero_referencia, fecha_creacion
      `, [
        userId,
        numeroReferencia,
        shippingId,
        subtotal,
        iva,
        total,
        moneda,
        tasaCambio,
        costoEnvio,
        tiempoEntrega,
        paymentIntentId,
        paymentStatus,
        'procesando'
      ]);

      const orderId = orderResult.rows[0].id_orden;
      const orderData = orderResult.rows[0];

      // Insertar detalles de la orden
      const orderDetails = [];
      for (const item of cartItems) {
        const detailResult = await client.query(`
          INSERT INTO pedido_detalle 
          (id_pedido, id_producto, id_variante, id_talla, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          orderId,
          item.id_producto,
          item.id_variante || null,
          item.id_talla || null,
          item.cantidad,
          item.precio_unitario,
          item.cantidad * item.precio_unitario
        ]);
        
        orderDetails.push(detailResult.rows[0]);
      }

      await client.query('COMMIT');
      console.log(`✅ [ORDERS] Orden creada exitosamente: ${numeroReferencia}`);

      // Crear orden en SkyDropX de forma asíncrona (no bloquear la respuesta)
      let skyDropXResult = null;
      try {
        console.log('🚀 [ORDERS] Iniciando creación de orden en SkyDropX...');
        
        skyDropXResult = await skyDropXService.createOrder({
          orderId: orderId,
          reference: numeroReferencia,
          shippingInfo: shippingInfo,
          cartItems: cartItems,
          total: total,
          moneda: moneda
        });

        if (skyDropXResult.success) {
          // Actualizar la orden con la información de SkyDropX
          await client.query(`
            UPDATE ordenes 
            SET skydropx_created = true, skydropx_order_id = $1
            WHERE id_orden = $2
          `, [skyDropXResult.orderId, orderId]);
          
          console.log('✅ [ORDERS] Orden creada en SkyDropX:', skyDropXResult.orderId);
        } else {
          console.log('⚠️ [ORDERS] No se pudo crear orden en SkyDropX:', skyDropXResult.error);
        }
      } catch (skyDropXError) {
        console.error('❌ [ORDERS] Error al crear orden en SkyDropX:', skyDropXError);
        // No fallar toda la operación por error en SkyDropX
      }

      // Responder con la orden creada
      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        order: {
          id: orderId,
          numeroReferencia: numeroReferencia,
          fechaCreacion: orderData.fecha_creacion,
          subtotal: subtotal,
          iva: iva,
          total: total,
          moneda: moneda,
          estado: 'procesando',
          skydropx_created: skyDropXResult?.success || false,
          skydropx_order_id: skyDropXResult?.orderId || null
        },
        orderDetails: orderDetails
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [ORDERS] Error creando orden:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error al crear la orden',
        error: error.message
      });
    } finally {
      client.release();
    }
  }

  // Obtener orden por ID
  static async getOrderById(req, res) {
    const db = require('../config/db');
    
    try {
      const { id } = req.params;

      const orderResult = await db.pool.query(`
        SELECT 
          o.*,
          ie.nombre_completo, ie.telefono, ie.direccion,
          ie.ciudad, ie.estado, ie.codigo_postal, ie.pais,
          u.nombres, u.apellidos, u.correo
        FROM ordenes o
        LEFT JOIN informacion_envio ie ON o.id_informacion_envio = ie.id_informacion
        LEFT JOIN usuarios u ON o.id_usuario = u.id_usuario
        WHERE o.id_orden = $1
      `, [id]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      const order = orderResult.rows[0];

      // Obtener detalles de la orden
      const detailsResult = await db.pool.query(`
        SELECT 
          pd.*,
          p.nombre as producto_nombre,
          vp.color, vp.material,
          t.nombre as talla_nombre
        FROM pedido_detalle pd
        LEFT JOIN productos p ON pd.id_producto = p.id_producto
        LEFT JOIN variantes_producto vp ON pd.id_producto = vp.id_producto AND pd.id_variante = vp.id_variante
        LEFT JOIN tallas t ON pd.id_talla = t.id_talla
        WHERE pd.id_pedido = $1
        ORDER BY pd.id_detalle
      `, [id]);

      res.json({
        success: true,
        order: {
          ...order,
          items: detailsResult.rows
        }
      });

    } catch (error) {
      console.error('❌ [ORDERS] Error obteniendo orden:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la orden',
        error: error.message
      });
    }
  }

  // Obtener orden por número de referencia
  static async getOrderByReference(req, res) {
    const db = require('../config/db');
    
    try {
      const { reference } = req.params;

      const orderResult = await db.pool.query(`
        SELECT 
          o.*,
          ie.nombre_completo, ie.telefono, ie.direccion,
          ie.ciudad, ie.estado, ie.codigo_postal, ie.pais,
          u.nombres, u.apellidos, u.correo
        FROM ordenes o
        LEFT JOIN informacion_envio ie ON o.id_informacion_envio = ie.id_informacion
        LEFT JOIN usuarios u ON o.id_usuario = u.id_usuario
        WHERE o.numero_referencia = $1
      `, [reference]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      const order = orderResult.rows[0];

      // Obtener detalles de la orden
      const detailsResult = await db.pool.query(`
        SELECT 
          pd.*,
          p.nombre as producto_nombre,
          vp.color, vp.material,
          t.nombre as talla_nombre
        FROM pedido_detalle pd
        LEFT JOIN productos p ON pd.id_producto = p.id_producto
        LEFT JOIN variantes_producto vp ON pd.id_producto = vp.id_producto AND pd.id_variante = vp.id_variante
        LEFT JOIN tallas t ON pd.id_talla = t.id_talla
        WHERE pd.id_pedido = $1
        ORDER BY pd.id_detalle
      `, [order.id_orden]);

      res.json({
        success: true,
        order: {
          ...order,
          items: detailsResult.rows
        }
      });

    } catch (error) {
      console.error('❌ [ORDERS] Error obteniendo orden por referencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la orden',
        error: error.message
      });
    }
  }

  // Obtener orden por Payment Intent ID
  static async getOrderByPaymentIntent(req, res) {
    const db = require('../config/db');
    
    try {
      const { paymentIntentId } = req.params;

      const orderResult = await db.pool.query(`
        SELECT 
          o.*,
          ie.nombre_completo, ie.telefono, ie.direccion,
          ie.ciudad, ie.estado, ie.codigo_postal, ie.pais,
          u.nombres, u.apellidos, u.correo
        FROM ordenes o
        LEFT JOIN informacion_envio ie ON o.id_informacion_envio = ie.id_informacion
        LEFT JOIN usuarios u ON o.id_usuario = u.id_usuario
        WHERE o.payment_intent_id = $1
      `, [paymentIntentId]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada para este Payment Intent'
        });
      }

      const order = orderResult.rows[0];

      // Obtener detalles de la orden
      const detailsResult = await db.pool.query(`
        SELECT 
          pd.*,
          p.nombre as producto_nombre,
          vp.color, vp.material,
          t.nombre as talla_nombre
        FROM pedido_detalle pd
        LEFT JOIN productos p ON pd.id_producto = p.id_producto
        LEFT JOIN variantes_producto vp ON pd.id_producto = vp.id_producto AND pd.id_variante = vp.id_variante
        LEFT JOIN tallas t ON pd.id_talla = t.id_talla
        WHERE pd.id_pedido = $1
        ORDER BY pd.id_detalle
      `, [order.id_orden]);

      res.json({
        success: true,
        order: {
          ...order,
          items: detailsResult.rows
        }
      });

    } catch (error) {
      console.error('❌ [ORDERS] Error obteniendo orden por Payment Intent:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la orden',
        error: error.message
      });
    }
  }

  // Actualizar estado de la orden
  static async updateOrderStatus(req, res) {
    const db = require('../config/db');
    
    try {
      const { id } = req.params;
      const { estado, estado_pago } = req.body;

      if (!estado && !estado_pago) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un estado para actualizar'
        });
      }

      let updateQuery = 'UPDATE ordenes SET fecha_actualizacion = CURRENT_TIMESTAMP';
      let updateParams = [];
      let paramIndex = 1;

      if (estado) {
        updateQuery += `, estado = $${paramIndex}`;
        updateParams.push(estado);
        paramIndex++;
      }

      if (estado_pago) {
        updateQuery += `, estado_pago = $${paramIndex}`;
        updateParams.push(estado_pago);
        paramIndex++;
      }

      updateQuery += ` WHERE id_orden = $${paramIndex} RETURNING *`;
      updateParams.push(id);

      const result = await db.pool.query(updateQuery, updateParams);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Estado de la orden actualizado',
        order: result.rows[0]
      });

    } catch (error) {
      console.error('❌ [ORDERS] Error actualizando estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado de la orden',
        error: error.message
      });
    }
  }

  // Obtener órdenes de un usuario
  static async getUserOrders(req, res) {
    const db = require('../config/db');
    
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const offset = (page - 1) * limit;

      const ordersResult = await db.pool.query(`
        SELECT 
          o.*,
          ie.nombre_completo, ie.telefono, ie.direccion,
          ie.ciudad, ie.estado, ie.codigo_postal, ie.pais
        FROM ordenes o
        LEFT JOIN informacion_envio ie ON o.id_informacion_envio = ie.id_informacion
        WHERE o.id_usuario = $1
        ORDER BY o.fecha_creacion DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Obtener el total de órdenes para paginación
      const countResult = await db.pool.query(
        'SELECT COUNT(*) as total FROM ordenes WHERE id_usuario = $1',
        [userId]
      );

      const totalOrders = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalOrders / limit);

      res.json({
        success: true,
        orders: ordersResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalOrders: totalOrders,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('❌ [ORDERS] Error obteniendo órdenes del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las órdenes del usuario',
        error: error.message
      });
    }
  }

  // Webhook de Stripe
  static async handleStripeWebhook(req, res) {
    const db = require('../config/db');
    
    try {
      const { type, data } = req.body;

      if (type === 'payment_intent.succeeded') {
        const paymentIntent = data.object;
        
        // Actualizar el estado de la orden
        await db.pool.query(`
          UPDATE ordenes 
          SET estado_pago = 'succeeded', estado = 'confirmado'
          WHERE payment_intent_id = $1
        `, [paymentIntent.id]);

        console.log(`✅ [WEBHOOK] Pago confirmado para Payment Intent: ${paymentIntent.id}`);
      }

      res.json({ received: true });

    } catch (error) {
      console.error('❌ [WEBHOOK] Error procesando webhook:', error);
      res.status(400).json({
        success: false,
        message: 'Error procesando webhook',
        error: error.message
      });
    }
  }

  // Crear orden manualmente en SkyDropX
  static async createSkyDropXOrder(req, res) {
    const db = require('../config/db');
    const skyDropXService = require('../services/skydropx.service');
    
    try {
      const { id } = req.params;

      // Obtener la orden y sus detalles
      const orderResult = await db.pool.query(`
        SELECT 
          o.*,
          ie.nombre_completo, ie.telefono, ie.direccion,
          ie.ciudad, ie.estado, ie.codigo_postal, ie.pais
        FROM ordenes o
        LEFT JOIN informacion_envio ie ON o.id_informacion_envio = ie.id_informacion
        WHERE o.id_orden = $1
      `, [id]);

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Orden no encontrada'
        });
      }

      const order = orderResult.rows[0];

      if (order.skydropx_created) {
        return res.status(400).json({
          success: false,
          message: 'La orden ya tiene una orden creada en SkyDropX'
        });
      }

      // Obtener items de la orden
      const itemsResult = await db.pool.query(`
        SELECT 
          pd.*,
          p.nombre as producto_nombre
        FROM pedido_detalle pd
        LEFT JOIN productos p ON pd.id_producto = p.id_producto
        WHERE pd.id_pedido = $1
      `, [id]);

      const skyDropXResult = await skyDropXService.createOrder({
        orderId: order.id_orden,
        reference: order.numero_referencia,
        shippingInfo: {
          nombre_completo: order.nombre_completo,
          telefono: order.telefono,
          direccion: order.direccion,
          ciudad: order.ciudad,
          estado: order.estado,
          codigo_postal: order.codigo_postal,
          pais: order.pais
        },
        cartItems: itemsResult.rows.map(item => ({
          id_producto: item.id_producto,
          nombre: item.producto_nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        })),
        total: parseFloat(order.total),
        moneda: order.moneda
      });

      if (skyDropXResult.success) {
        // Actualizar la orden con la información de SkyDropX
        await db.pool.query(`
          UPDATE ordenes 
          SET skydropx_created = true, skydropx_order_id = $1
          WHERE id_orden = $2
        `, [skyDropXResult.orderId, id]);

        res.json({
          success: true,
          message: 'Orden creada exitosamente en SkyDropX',
          skyDropXOrderId: skyDropXResult.orderId
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error creando orden en SkyDropX',
          error: skyDropXResult.error
        });
      }

    } catch (error) {
      console.error('❌ [ORDERS] Error creando orden SkyDropX:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear orden en SkyDropX',
        error: error.message
      });
    }
  }
}

module.exports = OrdersController;
