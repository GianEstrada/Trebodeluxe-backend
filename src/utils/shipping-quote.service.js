const { SkyDropXAuth } = require('./skydropx-auth');
const db = require('../config/db');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ShippingQuoteService {
  constructor() {
    this.skyDropXAuth = new SkyDropXAuth();
    this.baseUrl = 'https://pro.skydropx.com/api/v1';
    
    // Cache para códigos postales
    this.postalCodeCache = new Map();
    this.postalCodeDataLoaded = false;
    
    // Configuración del origen (Monterrey, NL)
    this.addressFrom = {
      country_code: "MX",
      postal_code: "64000",
      area_level1: "Nuevo León",
      area_level2: "Monterrey",
      area_level3: "Monterrey Centro"
    };
    
    // Paqueterías disponibles - incluir más opciones para mejor cobertura
    this.requestedCarriers = [
      "paquetexpress",
      "fedex",
      "dhl",
      "estafeta"
    ];
  }

  /**
   * Carga los códigos postales desde archivo CPdescarga.txt
   * @returns {Promise<void>}
   */
  async loadPostalCodeData() {
    if (this.postalCodeDataLoaded) return;
    
    try {
      console.log('📂 Cargando base de datos de códigos postales...');
      
      // Intentar múltiples rutas para mayor compatibilidad
      const possiblePaths = [
        path.join(__dirname, '..', 'Data', 'CPdescarga.txt'),   // Actual ubicación
        path.join(__dirname, '..', 'data', 'CPdescarga.txt'),  // Minúsculas
        path.join(process.cwd(), 'src', 'Data', 'CPdescarga.txt'), // Desde root
        path.join(process.cwd(), 'src', 'data', 'CPdescarga.txt')  // Desde root minúsculas
      ];
      
      let filePath = null;
      for (const testPath of possiblePaths) {
        try {
          await fs.access(testPath);
          filePath = testPath;
          console.log(`✅ Archivo encontrado en: ${filePath}`);
          break;
        } catch {
          // Continuar con la siguiente ruta
        }
      }
      
      if (!filePath) {
        throw new Error('Archivo CPdescarga.txt no encontrado en ninguna ubicación esperada');
      }
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      const lines = fileContent.split('\n');
      let loadedCount = 0;
      let processedCPs = new Set();
      
      for (const line of lines) {
        if (line.trim() && line.includes('|')) {
          const parts = line.split('|');
          
          // Formato SEPOMEX: CP|Colonia|Tipo|Municipio|Estado|Ciudad|...
          if (parts.length >= 5) {
            const cp = parts[0].trim();
            const colonia = parts[1].trim();
            const municipio = parts[3].trim(); 
            const estado = parts[4].trim();
            
            // Validar que el CP sea numérico de 5 dígitos
            if (/^\d{5}$/.test(cp) && estado && municipio && colonia) {
              // Si ya tenemos este CP, preferir la primera colonia encontrada
              if (!processedCPs.has(cp)) {
                this.postalCodeCache.set(cp, {
                  country_code: "MX",
                  postal_code: cp,
                  area_level1: estado,
                  area_level2: municipio,
                  area_level3: colonia
                });
                processedCPs.add(cp);
                loadedCount++;
              }
            }
          }
        }
      }
      
      console.log(`✅ Códigos postales cargados: ${loadedCount}`);
      this.postalCodeDataLoaded = true;
      
    } catch (error) {
      console.error('❌ Error cargando códigos postales:', error.message);
      console.log('🔄 Continuando con APIs externas como fallback...');
    }
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
      totalWeight: Math.max(totalWeight, 0.5), // Mínimo 0.5kg (500g) - corregido para KG
      dimensions: {
        length: Math.max(maxLength, 20), // Mínimo 20cm (más realista)
        width: Math.max(maxWidth, 15),   // Mínimo 15cm (más realista)  
        height: Math.max(compressedHeight, 8) // Mínimo 8cm (más realista)
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
      // Cargar datos locales si no están cargados
      await this.loadPostalCodeData();
      
      // Verificar cache local primero
      if (this.postalCodeCache.has(postalCode)) {
        console.log(`📍 CP ${postalCode} encontrado en base local`);
        return this.postalCodeCache.get(postalCode);
      }
      
      console.log(`🔍 CP ${postalCode} no encontrado localmente, consultando APIs externas...`);
      console.log('🏠 Obteniendo información de dirección para CP:', postalCode);
      
      // Usar API Zippopotam
      console.log('🔍 Consultando API Zippopotam...');
      const response = await fetch(`http://api.zippopotam.us/mx/${postalCode}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📍 Respuesta de Zippopotam:', data);
        
        if (data && data.places && data.places[0]) {
          const place = data.places[0];
          const addressData = {
            country_code: "MX",
            postal_code: postalCode,
            area_level1: place.state || "",
            area_level2: place['place name'] || "",
            area_level3: place['place name'] || ""
          };
          
          console.log('✅ Dirección obtenida de Zippopotam:', addressData);
          return addressData;
        }
      }
      
      // Si Zippopotam falla, usar fallback específico para CP conocidos
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
      console.log('� =========================');
      console.log('💰 INICIANDO COTIZACIÓN DE ENVÍO');
      console.log('🚀 =========================');
      console.log('📦 Cart ID:', cartId);
      console.log('📍 Código postal destino:', postalCodeTo);
      console.log('⏰ Timestamp:', new Date().toISOString());

      // Obtener token de autenticación
      console.log('🔑 Paso 1: Obteniendo token de autenticación...');
      const token = await this.skyDropXAuth.getBearerToken();
      console.log('✅ Token obtenido exitosamente');
      
      // Obtener datos del carrito
      console.log('🛒 Paso 2: Obteniendo datos del carrito...');
      const cartData = await this.getCartShippingData(cartId);
      console.log('📊 DATOS DEL CARRITO OBTENIDOS:');
      console.log('   Items:', cartData.cartItems.length);
      console.log('   Peso total:', cartData.totalWeight, 'kg');
      console.log('   Dimensiones:', JSON.stringify(cartData.dimensions));
      console.log('   Factor compresión:', cartData.compressionFactor);
      
      // Obtener datos de dirección destino
      console.log('🗺️  Paso 3: Obteniendo dirección destino...');
      const addressTo = await this.getAddressFromPostalCode(postalCodeTo);
      console.log('📍 DIRECCIÓN DESTINO:');
      console.log('   Estado:', addressTo.area_level1);
      console.log('   Municipio:', addressTo.area_level2);
      console.log('   Colonia:', addressTo.area_level3);
      console.log('   CP:', addressTo.postal_code);

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
              weight: Math.ceil(cartData.totalWeight),
              declared_value: 1000 // Valor declarado en pesos mexicanos
            }
          ],
          // No especificar requested_carriers inicialmente para obtener todas las opciones
          shipment_type: "package", // Tipo de envío
          quote_type: "carrier" // Tipo de cotización
        }
      };

      console.log('📤 Paso 4: Preparando solicitud a SkyDropX...');
      console.log('🔗 URL:', `${this.baseUrl}/quotations`);
      console.log('📋 PAYLOAD COMPLETO:', JSON.stringify(quotationPayload, null, 2));
      console.log('🔑 Authorization: Bearer [TOKEN_PRESENTE]');
      console.log('📤 Enviando solicitud...');

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
      console.log('🔍 STATUS RESPONSE:', response.status);
      console.log('🔍 HEADERS RESPONSE:', JSON.stringify(response.headers, null, 2));
      console.log('🔍 DATA RESPONSE COMPLETA:', JSON.stringify(response.data, null, 2));
      
      // Log específico de cotizaciones exitosas
      if (response.data && response.data.rates) {
        const successfulRates = response.data.rates.filter(rate => rate.success === true);
        const failedRates = response.data.rates.filter(rate => rate.success === false);
        
        console.log(`📊 RESUMEN DE COTIZACIONES:`);
        console.log(`   Total de rates: ${response.data.rates.length}`);
        console.log(`   Exitosas: ${successfulRates.length}`);
        console.log(`   Fallidas: ${failedRates.length}`);
        
        if (successfulRates.length > 0) {
          console.log('✅ COTIZACIONES EXITOSAS:');
          successfulRates.forEach((rate, index) => {
            console.log(`   ${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}: $${rate.total} ${rate.currency_code} (${rate.days} días)`);
          });
        }
        
        if (failedRates.length > 0) {
          console.log('❌ COTIZACIONES FALLIDAS (primeras 3):');
          failedRates.slice(0, 3).forEach((rate, index) => {
            const errorMsg = rate.error_messages && rate.error_messages.length > 0 
              ? rate.error_messages[0].error_message 
              : 'Sin mensaje de error';
            console.log(`   ${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}: ${errorMsg}`);
          });
        }
      }

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
      
      console.log('🎉 COTIZACIÓN COMPLETADA EXITOSAMENTE');
      console.log('📊 Datos retornados al cliente:', JSON.stringify({
        success: true,
        totalQuotations: response.data.rates ? response.data.rates.length : 0,
        successfulQuotations: response.data.rates ? response.data.rates.filter(r => r.success).length : 0,
        cartItems: cartData.cartItems.length,
        totalWeight: cartData.totalWeight + ' kg'
      }, null, 2));
      console.log('🚀 =========================');
      
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
      console.error('❌ Error obteniendo cotización de envío:', error.message);
      
      // Log detallado del error con más información
      if (error.response) {
        console.error('📋 DETALLES DEL ERROR DE SKYDROPX:');
        console.error('🔍 STATUS ERROR:', error.response.status);
        console.error('🔍 STATUS TEXT:', error.response.statusText);
        console.error('🔍 HEADERS ERROR:', JSON.stringify(error.response.headers, null, 2));
        console.error('🔍 DATA ERROR COMPLETA:', JSON.stringify(error.response.data, null, 2));
        
        // Log específico para errores comunes
        if (error.response.status === 401) {
          console.error('🚨 ERROR DE AUTENTICACIÓN: Token inválido o expirado');
        } else if (error.response.status === 422) {
          console.error('🚨 ERROR DE VALIDACIÓN: Datos de la solicitud incorrectos');
        } else if (error.response.status === 429) {
          console.error('🚨 ERROR DE RATE LIMIT: Demasiadas solicitudes');
        } else if (error.response.status >= 500) {
          console.error('🚨 ERROR DEL SERVIDOR: Problema en SkyDropX');
        }
      } else if (error.request) {
        console.error('📋 ERROR DE RED/CONEXIÓN:');
        console.error('🔍 REQUEST CONFIG:', JSON.stringify(error.config, null, 2));
        console.error('🚨 No se recibió respuesta del servidor');
      } else {
        console.error('📋 ERROR DESCONOCIDO:');
        console.error('🔍 ERROR STACK:', error.stack);
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'No additional details available',
        requestPayload: quotationPayload || null // Para debugging
      };
    }
  }

  /**
   * Formatea las cotizaciones para el frontend
   * @param {Object} quotationsResponse - Respuesta de SkyDropX
   * @returns {Array} Cotizaciones formateadas
   */
  formatQuotationsForFrontend(quotationsResponse) {
    console.log('🔄 Formateando cotizaciones para frontend...');
    console.log('📋 Input recibido:', JSON.stringify(quotationsResponse, null, 2));
    
    if (!quotationsResponse.success || !quotationsResponse.quotations) {
      console.log('❌ No hay cotizaciones exitosas para formatear');
      return [];
    }

    const quotations = quotationsResponse.quotations;
    
    // La respuesta de SkyDropX tiene rates, no data
    if (!quotations.rates || !Array.isArray(quotations.rates)) {
      console.log('❌ No se encontró array de rates en la respuesta');
      return [];
    }

    // Filtrar solo las cotizaciones exitosas
    const successfulRates = quotations.rates.filter(rate => rate.success === true);
    console.log(`📊 Rates exitosas encontradas: ${successfulRates.length} de ${quotations.rates.length} total`);

    if (successfulRates.length === 0) {
      console.log('❌ No hay rates exitosas para mostrar al frontend');
      return [];
    }

    // Formatear según la estructura real de SkyDropX
    const formattedQuotations = successfulRates.map(rate => {
      const formatted = {
        carrier: rate.provider_display_name,
        service: rate.provider_service_name,
        price: parseFloat(rate.total),
        currency: rate.currency_code,
        estimatedDays: rate.days,
        description: `${rate.provider_display_name} - ${rate.provider_service_name}`,
        // Datos adicionales útiles
        cost: rate.cost,
        zone: rate.zone,
        rateId: rate.id
      };
      
      console.log(`✅ Cotización formateada: ${formatted.carrier} - ${formatted.service}: $${formatted.price} ${formatted.currency} (${formatted.estimatedDays} días)`);
      
      return formatted;
    });

    console.log(`🎉 ${formattedQuotations.length} cotizaciones formateadas exitosamente`);
    return formattedQuotations;
  }
}

module.exports = ShippingQuoteService;
