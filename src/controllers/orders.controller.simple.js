// src/controllers/orders.controller.simple.js - Controlador simplificado para debug
const db = require('../config/db');

class OrdersController {
  
  // Crear nueva orden después del pago exitoso
  static async createOrder(req, res) {
    console.log('🆕 [ORDERS] Creando nueva orden (versión simplificada)...');
    
    try {
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
        metodoEnvio,
        costoEnvio = 0.00
      } = req.body;

      console.log('🆕 [ORDERS] Datos recibidos:', {
        userId,
        paymentIntentId,
        itemCount: cartItems?.length,
        total,
        moneda
      });

      // Por ahora, solo responder exitosamente sin crear en BD
      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente (versión de prueba)',
        order: {
          id_orden: 999,
          numero_referencia: 'TEST' + Date.now(),
          fecha_creacion: new Date().toISOString(),
          total: total,
          moneda: moneda,
          estado: 'procesando',
          skydropx_created: false,
          skydropx_order_id: null
        },
        orderDetails: cartItems || []
      });

    } catch (error) {
      console.error('❌ [ORDERS] Error en versión simplificada:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error al crear la orden',
        error: error.message
      });
    }
  }

  // Obtener orden por ID
  static async getOrderById(req, res) {
    res.status(501).json({
      success: false,
      message: 'Función no implementada en versión simplificada'
    });
  }

  // Obtener orden por referencia
  static async getOrderByReference(req, res) {
    res.status(501).json({
      success: false,
      message: 'Función no implementada en versión simplificada'
    });
  }

  // Obtener orden por Payment Intent
  static async getOrderByPaymentIntent(req, res) {
    res.status(501).json({
      success: false,
      message: 'Función no implementada en versión simplificada'
    });
  }

  // Webhook de Stripe
  static async handleStripeWebhook(req, res) {
    res.status(501).json({
      success: false,
      message: 'Función no implementada en versión simplificada'
    });
  }
}

module.exports = OrdersController;
