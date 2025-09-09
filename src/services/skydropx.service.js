// src/services/skydropx.service.js - Servicio para integración con SkyDropX
const db = require('../config/db');
const axios = require('axios');

class SkyDropXService {

  // Mapeo de carriers para SkyDropX
  static getCarrierMapping() {
    return {
      'fedex': 'fedex',
      'express': 'fedex',
      'estandar': 'fedex',
      'estándar': 'fedex',
      'dhl': 'dhl',
      'ups': 'ups',
      'paquetexpress': 'paquetexpress',
      'estafeta': 'estafeta',
      'redpack': 'redpack',
      'j&t': 'j&t'
    };
  }

  // Extraer carrier del método de envío
  static extractCarrierFromShippingMethod(shippingMethod) {
    if (!shippingMethod || typeof shippingMethod !== 'string') {
      return 'fedex'; // Default fallback
    }

    const method = shippingMethod.toLowerCase();
    const mapping = this.getCarrierMapping();
    
    // Buscar coincidencias en el nombre del método
    for (const [key, value] of Object.entries(mapping)) {
      if (method.includes(key)) {
        return value;
      }
    }
    
    return 'fedex'; // Default fallback
  }

  // Calcular valor declarado automáticamente
  static calculateDeclaredValue(totalPrice) {
    // Mínimo $100 MXN para evitar problemas con paqueterías
    const minValue = 100;
    const calculatedValue = Math.max(minValue, Math.round(totalPrice));
    
    console.log(`💰 [SKYDROPX] Valor declarado calculado: $${calculatedValue} MXN (total: $${totalPrice})`);
    return calculatedValue;
  }

  // Determinar si debe activarse el seguro automáticamente
  static shouldEnableInsurance(totalPrice, userChoice = false) {
    // Si el usuario eligió explícitamente, respetar su decisión
    if (userChoice !== undefined) {
      console.log(`🛡️ [SKYDROPX] Seguro elegido por usuario: ${userChoice}`);
      return userChoice;
    }
    
    // Regla automática: activar para órdenes > $500 MXN
    const threshold = 500;
    const autoInsurance = totalPrice > threshold;
    
    console.log(`🛡️ [SKYDROPX] Seguro automático: ${autoInsurance} (total: $${totalPrice}, threshold: $${threshold})`);
    return autoInsurance;
  }

  // Obtener token de acceso de SkyDropX
  static async getAccessToken() {
    try {
      const clientId = process.env.SKYDROP_API_KEY;
      const clientSecret = process.env.SKYDROP_API_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Credenciales de SkyDropX no configuradas');
      }

      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'client_credentials');
      params.append('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
      params.append('refresh_token', '');
      params.append('scope', 'default orders.create');

      console.log('🔑 [SKYDROPX] Obteniendo token de acceso...');
      
      const response = await axios.post(
        'https://pro.skydropx.com/api/v1/oauth/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data.access_token) {
        console.log('✅ [SKYDROPX] Token obtenido exitosamente');
        return response.data.access_token;
      } else {
        throw new Error('No se recibió token de acceso');
      }

    } catch (error) {
      console.error('❌ [SKYDROPX] Error obteniendo token:', error.response?.data || error.message);
      throw new Error(`Error de autenticación SkyDropX: ${error.message}`);
    }
  }
  
  // Crear orden en SkyDropX
  static async createOrder(orderData) {
    try {
      const {
        orderId,
        referenceNumber,
        reference, // Compatibilidad con versión anterior
        paymentStatus,
        totalPrice,
        total, // Compatibilidad con versión anterior
        cartItems,
        shippingInfo,
        shippingMethod,
        insurance
      } = orderData;

      // Usar referenceNumber o reference como fallback
      const finalReferenceNumber = referenceNumber || reference;
      const finalTotalPrice = totalPrice || total;

      // Debug logging para identificar el problema
      console.log('🔍 [SKYDROPX] orderData recibido:', JSON.stringify(orderData, null, 2));
      console.log('🔍 [SKYDROPX] referenceNumber valor:', JSON.stringify(finalReferenceNumber));
      console.log('🔍 [SKYDROPX] referenceNumber tipo:', typeof finalReferenceNumber);

      // Validar datos requeridos con protección adicional
      if (!finalReferenceNumber || finalReferenceNumber.toString().trim() === '') {
        console.error('❌ [SKYDROPX] referenceNumber inválido:', finalReferenceNumber);
        console.error('📋 [SKYDROPX] orderData completo:', orderData);
        throw new Error('referenceNumber es requerido y debe ser un string no vacío');
      }
      if (!cartItems || cartItems.length === 0) {
        throw new Error('cartItems es requerido y debe tener al menos un item');
      }
      if (!shippingInfo) {
        throw new Error('shippingInfo es requerido');
      }
      if (!finalTotalPrice || isNaN(finalTotalPrice)) {
        throw new Error('totalPrice debe ser un número válido');
      }

      console.log('🚀 [SKYDROPX] Creando orden:', finalReferenceNumber);

      // 1. Obtener configuración del shipper
      const shipperResult = await db.pool.query(`
        SELECT * FROM shipper_config WHERE is_active = true LIMIT 1
      `);

      if (shipperResult.rows.length === 0) {
        throw new Error('No se encontró configuración de shipper activa');
      }

      const shipper = shipperResult.rows[0];

      // 2. Calcular dimensiones y peso del paquete
      const packageDimensions = SkyDropXService.calculatePackageDimensions(cartItems);
      
      // 3. Preparar productos para SkyDropX
      const products = cartItems.map(item => ({
        name: item.producto_nombre || `Producto ${item.id_producto}`,
        hs_code: SkyDropXService.getHSCodeByCategory(item.categoria || 'general'),
        sku: `${item.id_producto}-${item.id_variante || 0}-${item.id_talla || 0}`,
        price: (item.precio_unitario || item.precio || 0).toString(),
        quantity: item.cantidad || 1,
        weight: (item.peso_gramos || 100) / 1000, // Convertir a kg
        height: 0.05, // 5cm por defecto
        length: 0.10, // 10cm por defecto
        width: 0.08   // 8cm por defecto
      }));

      // 4. Construir JSON para SkyDropX - ENFOQUE EN VALOR DECLARADO
      const declaredValueCalculated = this.calculateDeclaredValue(finalTotalPrice);
      
      const skyDropXPayload = {
        // MÚLTIPLES OPCIONES PARA VALOR DECLARADO
        declared_value: declaredValueCalculated,
        value: declaredValueCalculated,
        total_value: declaredValueCalculated,
        
        // DATOS DE LA ORDEN
        order: {
          reference: finalReferenceNumber,
          reference_number: finalReferenceNumber,
          payment_status: paymentStatus === 'succeeded' ? 'paid' : 'pending',
          total_price: (finalTotalPrice || 0).toString(),
          
          // VALOR DECLARADO EN MÚLTIPLES FORMATOS
          declared_value: declaredValueCalculated,
          value: declaredValueCalculated,
          total_value: declaredValueCalculated,
          
          merchant_store_id: "1",
          headquarter_id: "1", 
          platform: "trebodeluxe",
          package_type: "box",
          parcels: [{
            weight: packageDimensions.totalWeight,
            length: packageDimensions.length,
            width: packageDimensions.width,
            height: packageDimensions.height,
            quantity: 1,
            dimension_unit: "CM",
            mass_unit: "KG",
            package_type: "box",
            
            // VALOR DECLARADO EN MÚLTIPLES FORMATOS
            declared_value: declaredValueCalculated,
            value: declaredValueCalculated,
            total_value: declaredValueCalculated,
            
            consignment_note: `Orden ${finalReferenceNumber} - ${cartItems.length} items`,
            products: products
          }],
          shipper_address: {
            address: shipper.address,
            internal_number: shipper.internal_number,
            reference: shipper.reference,
            sector: shipper.sector,
            city: shipper.city,
            state: shipper.state,
            postal_code: shipper.postal_code,
            country: shipper.country,
            person_name: shipper.person_name,
            company: shipper.company_name,
            phone: shipper.phone,
            email: shipper.email
          },
          recipient_address: {
            address: shippingInfo.direccion,
            internal_number: shippingInfo.numero_interior || "",
            reference: shippingInfo.referencias || shippingInfo.referencia || ".",
            sector: shippingInfo.colonia || shippingInfo.sector || "",
            city: shippingInfo.ciudad,
            state: shippingInfo.estado,
            postal_code: shippingInfo.codigo_postal,
            country: shippingInfo.pais || "MX",
            person_name: shippingInfo.nombre_completo,
            company: shippingInfo.empresa || "",
            phone: shippingInfo.telefono,
            email: shippingInfo.correo || ""
          }
        }
      };

      console.log('📦 [SKYDROPX] Payload preparado:', JSON.stringify(skyDropXPayload, null, 2));
      
      // Logging específico para valor declarado
      console.log('💰 [SKYDROPX] VERIFICACIÓN DE VALOR DECLARADO:');
      console.log(`   🎯 Valor calculado: $${declaredValueCalculated} MXN`);
      console.log(`   � Nivel raíz - declared_value: ${skyDropXPayload.declared_value}`);
      console.log(`   � Nivel raíz - value: ${skyDropXPayload.value}`);
      console.log(`   � Nivel raíz - total_value: ${skyDropXPayload.total_value}`);
      console.log(`   📍 Orden - declared_value: ${skyDropXPayload.order.declared_value}`);
      console.log(`   📍 Orden - value: ${skyDropXPayload.order.value}`);
      console.log(`   � Parcel - declared_value: ${skyDropXPayload.order.parcels[0].declared_value}`);

      // 5. Obtener token de acceso
      const accessToken = await SkyDropXService.getAccessToken();

      // 6. Enviar orden a SkyDropX
      console.log('📡 [SKYDROPX] Enviando orden a la API...');
      
      const apiResponse = await axios.post(
        'https://pro.skydropx.com/api/v1/orders',
        skyDropXPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000 // 30 segundos timeout
        }
      );

      console.log('✅ [SKYDROPX] Respuesta de la API:', apiResponse.status);
      console.log('📋 [SKYDROPX] Datos recibidos:', JSON.stringify(apiResponse.data, null, 2));

      // 7. Procesar respuesta exitosa - Ajustado para la nueva estructura de respuesta
      if (apiResponse.data && apiResponse.data.data && apiResponse.data.data.id) {
        const orderData = apiResponse.data.data;
        const attributes = orderData.attributes || {};
        
        console.log('✅ [SKYDROPX] Orden creada exitosamente:');
        console.log(`   🆔 ID: ${orderData.id}`);
        console.log(`   📦 Platform: ${attributes.platform}`);
        console.log(`   💰 Price: $${attributes.price}`);
        console.log(`   📋 Ecommerce ID: ${attributes.ecommerce_id}`);
        
        return {
          success: true,
          orderId: orderData.id,
          platform: attributes.platform,
          price: attributes.price,
          ecommerce_id: attributes.ecommerce_id,
          created_at: attributes.created_at,
          message: 'Orden creada exitosamente en SkyDropX',
          rawResponse: apiResponse.data
        };
      } else if (apiResponse.data && apiResponse.data.id) {
        // Formato anterior por compatibilidad
        return {
          success: true,
          orderId: apiResponse.data.id,
          trackingNumber: apiResponse.data.tracking_number || null,
          status: apiResponse.data.status || 'created',
          details: {
            payload: skyDropXPayload,
            response: apiResponse.data,
            packageInfo: packageDimensions
          }
        };
      } else {
        throw new Error('Respuesta inválida de SkyDropX');
      }

    } catch (error) {
      console.error('❌ [SKYDROPX] Error creando orden:', error.message);
      
      // Log detallado del error si es de axios
      if (error.response) {
        console.error('📊 [SKYDROPX] Status:', error.response.status);
        console.error('📋 [SKYDROPX] Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        error: error.message,
        details: { 
          orderData,
          errorResponse: error.response?.data || null
        }
      };
    }
  }

  // Calcular dimensiones del paquete basado en los items
  static calculatePackageDimensions(cartItems) {
    const baseWeight = 0.1; // 100g peso base del empaque
    const itemWeight = 0.3;  // 300g peso promedio por item
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.cantidad, 0);
    const totalWeight = baseWeight + (totalItems * itemWeight); // en kg
    
    // Dimensiones basadas en cantidad de items
    let length, width, height;
    
    if (totalItems <= 2) {
      length = 20; width = 15; height = 8;
    } else if (totalItems <= 5) {
      length = 30; width = 20; height = 15;
    } else if (totalItems <= 10) {
      length = 40; width = 30; height = 20;
    } else {
      length = 50; width = 35; height = 25;
    }

    const estimatedCost = SkyDropXService.estimateShippingCost(totalWeight, length, width, height);

    return {
      totalWeight: Math.round(totalWeight * 100) / 100, // Redondear a 2 decimales
      length,
      width, 
      height,
      totalItems,
      estimatedCost
    };
  }

  // Estimar costo de envío
  static estimateShippingCost(weight, length, width, height) {
    const baseRate = 150; // $150 MXN base
    const weightRate = weight * 50; // $50 MXN por kg
    const volumeRate = (length * width * height) / 1000 * 2; // $2 MXN por cada 1000 cm³
    
    return Math.round(baseRate + weightRate + volumeRate);
  }

  // Obtener código HS basado en categoría
  static getHSCodeByCategory(category) {
    const hsCodes = {
      'textiles': '6109.10.00',
      'ropa': '6109.10.00', 
      'calzado': '6403.91.00',
      'accesorios': '4202.92.00',
      'hogar': '6307.90.00',
      'general': '6109.10.00' // Código por defecto para prendas de vestir
    };

    return hsCodes[category.toLowerCase()] || hsCodes.general;
  }

  // Obtener estado de orden desde SkyDropX
  static async getOrderStatus(skyDropXOrderId) {
    try {
      // En producción, aquí harías la llamada a la API de SkyDropX
      // Por ahora, simulamos diferentes estados
      
      const simulatedStatuses = [
        'created', 'in_transit', 'out_for_delivery', 'delivered'
      ];
      
      const randomStatus = simulatedStatuses[Math.floor(Math.random() * simulatedStatuses.length)];
      
      return {
        success: true,
        status: randomStatus,
        trackingEvents: [
          {
            status: 'created',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Orden creada en SkyDropX'
          },
          {
            status: 'in_transit',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), 
            description: 'Paquete en tránsito'
          }
        ]
      };

    } catch (error) {
      console.error('❌ [SKYDROPX] Error obteniendo estado:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Webhook para actualizaciones de SkyDropX
  static async handleWebhook(webhookData) {
    try {
      console.log('🎯 [SKYDROPX] Webhook recibido:', webhookData);

      const { order_id, status, tracking_number, reference } = webhookData;

      // Actualizar estado en nuestra base de datos
      const result = await db.pool.query(`
        UPDATE ordenes 
        SET 
          skydropx_status = $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE skydropx_order_id = $2 OR numero_referencia = $3
        RETURNING id_orden, numero_referencia
      `, [status, order_id, reference]);

      if (result.rows.length > 0) {
        console.log('✅ [SKYDROPX] Estado actualizado para orden:', result.rows[0].numero_referencia);
        return { success: true, updated: result.rows[0] };
      } else {
        console.warn('⚠️ [SKYDROPX] No se encontró orden para actualizar');
        return { success: false, message: 'Orden no encontrada' };
      }

    } catch (error) {
      console.error('❌ [SKYDROPX] Error en webhook:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancelar orden en SkyDropX
  static async cancelOrder(skyDropXOrderId) {
    try {
      // En producción, llamada a API de SkyDropX para cancelar
      console.log('🚫 [SKYDROPX] Cancelando orden:', skyDropXOrderId);

      // Simulación
      const simulatedResponse = {
        success: true,
        status: 'cancelled',
        cancellation_reason: 'Customer request'
      };

      return simulatedResponse;

    } catch (error) {
      console.error('❌ [SKYDROPX] Error cancelando orden:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SkyDropXService;
