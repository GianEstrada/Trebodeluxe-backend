const { SkyDropXAuth } = require('./skydropx-auth');
const db = require('../config/db');
const axios = require('axios');

class ShippingQuoteService {
  constructor() {
    this.skyDropAuth = new SkyDropXAuth();
    this.baseUrl = 'https://pro.skydropx.com/api/v1';
    
    // Configuración del origen (Monterrey, NL)
    this.addressFrom = {
      country_code: "MX",
      postal_code: "64000",
      area_level1: "Nuevo León",
      area_level2: "Monterrey",
      area_level3: "Monterrey Centro"
    };
    
    // Paqueterías disponibles
    this.requestedCarriers = [
      "fedex",
      "dhl", 
      "estafeta",
      "ups"
    ];
  }

  /**
   * Obtiene los datos completos del carrito con productos, variantes y categorías
   * @param {string} cartId - ID del carrito
   * @returns {Promise<Object>} Datos del carrito con dimensiones calculadas
   */
  async getCartShippingData(cartId) {
    try {
      console.log('🛒 Obteniendo datos del carrito para envío:', cartId);

      // Primero verificar si el carrito existe
      const cartCheck = await db.query('SELECT id_carrito FROM carritos WHERE id_carrito = $1', [cartId]);
      if (cartCheck.rows.length === 0) {
        throw new Error(`Carrito con ID ${cartId} no encontrado`);
      }

      const query = `
        SELECT 
          cc.id_contenido,
          cc.cantidad,
          p.id_producto,
          CONCAT(p.nombre, ' - ', v.nombre) as producto_nombre,
          s.precio,
          p.id_categoria,
          c.nombre as categoria_nombre,
          c.alto_cm,
          c.largo_cm,
          c.ancho_cm,
          c.peso_kg,
          c.nivel_compresion,
          v.id_variante,
          v.nombre as variante_nombre,
          t.id_talla,
          t.nombre_talla as talla_nombre
        FROM contenido_carrito cc
        INNER JOIN productos p ON cc.id_producto = p.id_producto
        INNER JOIN categorias c ON p.id_categoria = c.id_categoria
        INNER JOIN variantes v ON cc.id_variante = v.id_variante
        INNER JOIN tallas t ON cc.id_talla = t.id_talla
        INNER JOIN stock s ON cc.id_producto = s.id_producto 
                           AND cc.id_variante = s.id_variante 
                           AND cc.id_talla = s.id_talla
        WHERE cc.id_carrito = $1
        ORDER BY cc.fecha_agregado
      `;

      const result = await db.query(query, [cartId]);
      
      console.log('📋 Resultado de consulta del carrito:', {
        rowCount: result.rows.length,
        cartId: cartId
      });
      
      if (result.rows.length === 0) {
        throw new Error('Carrito vacío o no encontrado');
      }

      // Calcular dimensiones totales del envío
      const shippingData = this.calculateShippingDimensions(result.rows);
      
      console.log('📦 Datos del carrito calculados:', {
        items: result.rows.length,
        totalWeight: shippingData.totalWeight,
        dimensions: shippingData.dimensions
      });

      return {
        cartItems: result.rows,
        ...shippingData
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo datos del carrito:', error);
      throw error;
    }
  }

  /**
   * Calcula las dimensiones totales de envío basado en los productos del carrito
   * @param {Array} cartItems - Items del carrito
   * @returns {Object} Dimensiones calculadas
   */
  calculateShippingDimensions(cartItems) {
    let totalWeight = 0;
    let totalVolume = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;

    cartItems.forEach(item => {
      const quantity = item.cantidad;
      const itemWeight = parseFloat(item.peso_kg || 0) * quantity;
      const itemHeight = parseFloat(item.alto_cm || 0);
      const itemLength = parseFloat(item.largo_cm || 0);
      const itemWidth = parseFloat(item.ancho_cm || 0);
      
      // Sumar peso total
      totalWeight += itemWeight;
      
      // Calcular volumen
      const itemVolume = itemHeight * itemLength * itemWidth * quantity;
      totalVolume += itemVolume;
      
      // Mantener las dimensiones máximas
      maxLength = Math.max(maxLength, itemLength);
      maxWidth = Math.max(maxWidth, itemWidth);
      totalHeight += itemHeight * quantity; // Apilar en altura
    });

    // Aplicar factor de compresión si es necesario
    const compressionFactor = this.getCompressionFactor(cartItems);
    const compressedHeight = totalHeight * compressionFactor;

    return {
      totalWeight: Math.max(totalWeight, 100), // Mínimo 100g
      dimensions: {
        length: Math.max(maxLength, 10), // Mínimo 10cm
        width: Math.max(maxWidth, 10),   // Mínimo 10cm  
        height: Math.max(compressedHeight, 5) // Mínimo 5cm
      },
      compressionFactor: compressionFactor
    };
  }

  /**
   * Obtiene el factor de compresión basado en las categorías de productos
   * @param {Array} cartItems - Items del carrito
   * @returns {number} Factor de compresión (0.1 a 1.0)
   */
  getCompressionFactor(cartItems) {
    // Obtener el factor de compresión promedio de las categorías
    let totalCompression = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
      if (item.nivel_compresion) {
        let compression;
        switch(item.nivel_compresion.toLowerCase()) {
          case 'bajo':
            compression = 0.9; // 90% del volumen original
            break;
          case 'medio':
            compression = 0.7; // 70% del volumen original
            break;
          case 'alto':
            compression = 0.5; // 50% del volumen original
            break;
          default:
            compression = 0.7; // Por defecto medio
        }
        totalCompression += compression;
        itemCount++;
      }
    });

    // Si no hay datos de compresión, usar factor conservador
    if (itemCount === 0) {
      return 0.7; // 70% de compresión por defecto
    }

    return Math.max(0.1, Math.min(1.0, totalCompression / itemCount));
  }

  /**
   * Obtiene datos de dirección basado en código postal
   * @param {string} postalCode - Código postal destino
   * @returns {Promise<Object>} Datos de la dirección
   */
  async getAddressFromPostalCode(postalCode) {
    try {
      console.log('🏠 Obteniendo información de dirección para CP:', postalCode);
      
      // Intentar múltiples APIs en orden de preferencia
      const apis = [
        {
          name: 'API CopomexAPI',
          url: `https://api.copomex.com/query/info_cp/${postalCode}?token=pruebas`,
          parser: (data) => {
            if (data && data[0]) {
              const location = data[0];
              return {
                area_level1: location.estado || location.state || "",
                area_level2: location.municipio || location.municipality || "",
                area_level3: location.asentamiento || location.settlement || ""
              };
            }
            return null;
          }
        },
        {
          name: 'API Zippopotam',
          url: `http://api.zippopotam.us/mx/${postalCode}`,
          parser: (data) => {
            if (data && data.places && data.places[0]) {
              const place = data.places[0];
              return {
                area_level1: place.state || "",
                area_level2: place['place name'] || "",
                area_level3: place['place name'] || ""
              };
            }
            return null;
          }
        }
      ];

      // Probar cada API
      for (const api of apis) {
        try {
          console.log(`🔍 Probando ${api.name}...`);
          const response = await fetch(api.url);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📍 Respuesta de ${api.name}:`, data);
            
            const parsed = api.parser(data);
            if (parsed && parsed.area_level1) {
              const addressData = {
                country_code: "MX",
                postal_code: postalCode,
                area_level1: parsed.area_level1,
                area_level2: parsed.area_level2,
                area_level3: parsed.area_level3
              };
              
              console.log(`✅ Dirección obtenida de ${api.name}:`, addressData);
              return addressData;
            }
          }
        } catch (apiError) {
          console.log(`❌ Error con ${api.name}:`, apiError.message);
          continue;
        }
      }
      
      // Si ninguna API funciona, usar fallback específico para CP conocidos
      const knownPostalCodes = {
        '66058': {
          area_level1: "Nuevo León",
          area_level2: "General Escobedo", 
          area_level3: "Praderas de San José"
        },
        '64000': {
          area_level1: "Nuevo León",
          area_level2: "Monterrey",
          area_level3: "Centro"
        }
      };
      
      if (knownPostalCodes[postalCode]) {
        console.log('🗂️ Usando datos conocidos para CP:', postalCode);
        return {
          country_code: "MX",
          postal_code: postalCode,
          ...knownPostalCodes[postalCode]
        };
      }
      
      throw new Error('No se pudo obtener información del código postal');
      
    } catch (error) {
      console.error('❌ Error obteniendo datos de dirección:', error);
      
      // Fallback: usar datos básicos para que no falle completamente
      console.log('🔄 Usando fallback genérico para dirección...');
      return {
        country_code: "MX",
        postal_code: postalCode,
        area_level1: "México", // Estado genérico
        area_level2: "Ciudad", // Ciudad genérica  
        area_level3: "Centro"  // Colonia genérica
      };
    }
  }

  /**
   * Solicita cotización de envío a SkyDropX
   * @param {string} cartId - ID del carrito
   * @param {string} postalCodeTo - Código postal destino
   * @returns {Promise<Object>} Cotizaciones de envío
   */
  async getShippingQuote(cartId, postalCodeTo) {
    try {
      console.log('💰 Solicitando cotización de envío para carrito:', cartId, 'hacia:', postalCodeTo);

      // Obtener token de autenticación
      const token = await this.skyDropAuth.getBearerToken();
      
      // Obtener datos del carrito
      const cartData = await this.getCartShippingData(cartId);
      
      // Obtener datos de dirección destino
      const addressTo = await this.getAddressFromPostalCode(postalCodeTo);

      // Preparar payload para SkyDropX
      const quotationPayload = {
        quotation: {
          order_id: `cart_${cartId}_${Date.now()}`,
          address_from: this.addressFrom,
          address_to: addressTo,
          parcels: [
            {
              length: Math.ceil(cartData.dimensions.length),
              width: Math.ceil(cartData.dimensions.width),
              height: Math.ceil(cartData.dimensions.height),
              weight: Math.ceil(cartData.totalWeight)
            }
          ],
          requested_carriers: this.requestedCarriers
        }
      };

      console.log('📤 Enviando solicitud a SkyDropX:', JSON.stringify(quotationPayload, null, 2));

      // Hacer petición a SkyDropX
      const response = await axios.post(
        `${this.baseUrl}/quotations`,
        quotationPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('📥 Respuesta de SkyDropX recibida');

      return {
        success: true,
        cartData: {
          items: cartData.cartItems.length,
          totalWeight: cartData.totalWeight,
          dimensions: cartData.dimensions,
          compressionFactor: cartData.compressionFactor
        },
        quotations: response.data,
        requestPayload: quotationPayload // Para debugging
      };

    } catch (error) {
      console.error('❌ Error obteniendo cotización de envío:', error);
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'No additional details available'
      };
    }
  }

  /**
   * Formatea las cotizaciones para el frontend
   * @param {Object} quotationsResponse - Respuesta de SkyDropX
   * @returns {Array} Cotizaciones formateadas
   */
  formatQuotationsForFrontend(quotationsResponse) {
    if (!quotationsResponse.success || !quotationsResponse.quotations) {
      return [];
    }

    const quotations = quotationsResponse.quotations;
    
    // Asumiendo que la respuesta tiene un array de cotizaciones
    return (quotations.data || []).map(quote => ({
      carrier: quote.carrier,
      service: quote.service_level,
      price: quote.total_pricing,
      currency: quote.currency,
      estimatedDays: quote.days,
      description: quote.description || `${quote.carrier} - ${quote.service_level}`
    }));
  }
}

module.exports = ShippingQuoteService;
