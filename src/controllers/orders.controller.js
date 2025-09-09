// src/controllers/orders.controller.js - Controlador para gestión de órdenes
// DEPLOYMENT VERSION 2025-09-09 - FIXED ultima_actualizacion + pedido_detalle columns

class OrdersController {
  
  // Crear nueva orden después del pago exitoso
  static async createOrder(req, res) {
    const db = require('../config/db');
    const skyDropXService = require('../services/skydropx.service');
    
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        cartItems,
        userId = null,
        shippingInfo,
        paymentIntentId,
        paymentStatus = 'succeeded',
        subtotal,
        iva,
        total,
        moneda = 'MXN',
        tasaCambio = 1.0,
        costoEnvio = 0,
        tiempoEntrega = '3-5 días hábiles',
        metodoPago = 'stripe',
        metodoEnvio = 'standard'
      } = req.body;

      console.log(`🔄 [ORDERS] Iniciando creación de orden - Usuario: ${userId}, PaymentIntent: ${paymentIntentId}`);

      // 1. Validaciones básicas
      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren items del carrito'
        });
      }

      if (!shippingInfo) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere información de envío'
        });
      }

      // 2. Crear o actualizar información de envío  
      let shippingInfoId;
      
      if (userId && shippingInfo.id_informacion) {
        // Usuario logueado con información existente - actualizar datos
        // FIXED: Using 'ultima_actualizacion' column (verified in DB schema)
        console.log(`🔄 [ORDERS] Actualizando información de envío para usuario ${userId}`);
        console.log(`🔄 [ORDERS] Using ultima_actualizacion column - DEPLOYMENT FIXED`);
        await client.query(`
          UPDATE informacion_envio 
          SET nombre_completo = $1, telefono = $2, direccion = $3, 
              ciudad = $4, estado = $5, codigo_postal = $6, pais = $7,
              ultima_actualizacion = CURRENT_TIMESTAMP
          WHERE id_informacion = $8
        `, [
          shippingInfo.nombre_completo,
          shippingInfo.telefono,
          shippingInfo.direccion,
          shippingInfo.ciudad,
          shippingInfo.estado,
          shippingInfo.codigo_postal,
          shippingInfo.pais || 'MX',
          shippingInfo.id_informacion
        ]);
        
        shippingInfoId = shippingInfo.id_informacion;
      } else {
        // Crear nueva información de envío
        console.log(`🔄 [ORDERS] Creando nueva información de envío`);
        const shippingResult = await client.query(`
          INSERT INTO informacion_envio (
            id_usuario, nombre_completo, telefono, direccion,
            ciudad, estado, codigo_postal, pais
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id_informacion
        `, [
          userId,
          shippingInfo.nombre_completo,
          shippingInfo.telefono,
          shippingInfo.direccion,
          shippingInfo.ciudad,
          shippingInfo.estado,
          shippingInfo.codigo_postal,
          shippingInfo.pais || 'MX'
        ]);
        
        shippingInfoId = shippingResult.rows[0].id_informacion;
      }

      // 3. Generar número de referencia único
      const referenceResult = await client.query('SELECT generate_reference_number() as numero');
      const numeroReferencia = referenceResult.rows[0].numero;

      console.log(`🔄 [ORDERS] Número de referencia generado: ${numeroReferencia}`);

      // 4. Crear la orden principal
      const orderResult = await client.query(`
        INSERT INTO ordenes (
          id_usuario, id_informacion_envio, numero_referencia,
          metodo_envio, costo_envio, subtotal, iva, total,
          moneda, tasa_cambio, stripe_payment_intent_id, stripe_payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id_orden, numero_referencia, fecha_creacion
      `, [
        userId,
        shippingInfoId,
        numeroReferencia,
        metodoEnvio,
        costoEnvio,
        subtotal,
        iva,
        total,
        moneda,
        tasaCambio,
        paymentIntentId,
        paymentStatus
      ]);

      const orderId = orderResult.rows[0].id_orden;
      const orderData = orderResult.rows[0];

      console.log(`✅ [ORDERS] Orden principal creada con ID: ${orderId}`);

      // 5. Insertar detalles de la orden
      // FIXED: Removed 'subtotal' column from pedido_detalle (doesn't exist in table)
      const orderDetails = [];
      for (const item of cartItems) {
        const detailResult = await client.query(`
          INSERT INTO pedido_detalle 
          (id_pedido, id_producto, id_variante, id_talla, cantidad, precio_unitario)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          orderId,
          item.id_producto,
          item.id_variante || null,
          item.id_talla || null,
          item.cantidad,
          item.precio_unitario || item.precio
        ]);
        
        orderDetails.push(detailResult.rows[0]);
      }

      console.log(`✅ [ORDERS] ${orderDetails.length} detalles de orden insertados`);

      // 6. Intentar crear orden en SkyDropX
      let skyDropXResult = null;
      try {
        console.log(`🚀 [ORDERS] Iniciando creación de orden en SkyDropX...`);
        
        skyDropXResult = await skyDropXService.createOrder({
          orderId: orderId,
          reference: numeroReferencia,
          shippingInfo: shippingInfo,
          cartItems: cartItems,
          total: total,
          moneda: moneda
        });

        if (skyDropXResult && skyDropXResult.success) {
          // Actualizar la orden con la información de SkyDropX
          await client.query(`
            UPDATE ordenes 
            SET skydropx_order_id = $1, skydropx_status = 'created'
            WHERE id_orden = $2
          `, [skyDropXResult.orderId, orderId]);
          
          console.log(`✅ [ORDERS] Orden creada en SkyDropX: ${skyDropXResult.orderId}`);
        }
      } catch (skyDropXError) {
        console.error(`⚠️ [ORDERS] Error en SkyDropX (no crítico):`, skyDropXError.message);
        // No fallar toda la operación por error en SkyDropX
      }

      await client.query('COMMIT');
      console.log(`✅ [ORDERS] Transacción completada exitosamente`);

      // 7. Responder con la orden creada
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
        WHERE o.stripe_payment_intent_id = $1
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
      const { estado_orden, skydropx_status } = req.body;

      const result = await db.pool.query(`
        UPDATE ordenes 
        SET 
          estado_orden = COALESCE($2, estado_orden),
          skydropx_status = COALESCE($3, skydropx_status),
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_orden = $1
        RETURNING *
      `, [id, estado_orden, skydropx_status]);

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
          SET stripe_payment_status = 'succeeded', estado_orden = 'pagado'
          WHERE stripe_payment_intent_id = $1
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

      if (order.skydropx_order_id) {
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
          SET skydropx_order_id = $1, skydropx_status = 'created'
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
