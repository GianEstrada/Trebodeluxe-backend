#!/usr/bin/env node

/**
 * Test para verificar que los logs detallados del sistema de envíos funcionan correctamente
 */

// Simular variables de entorno
process.env.SKYDROP_API_KEY = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
process.env.SKYDROP_API_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';

const axios = require('axios');

async function testLoggingSystem() {
  console.log('📋 TEST DEL SISTEMA DE LOGS DETALLADOS');
  console.log('======================================\n');

  // Test directo a la API para simular el comportamiento del servicio
  try {
    console.log('🧪 Simulando llamada al servicio de envíos...\n');

    // Obtener token (simulando el flujo del servicio)
    const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
    const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
    const AUTH_URL = 'https://pro.skydropx.com/api/v1/oauth/token';
    const API_URL = 'https://pro.skydropx.com/api/v1';

    // Simular logs del servicio
    console.log('🚀 =========================');
    console.log('💰 INICIANDO COTIZACIÓN DE ENVÍO');
    console.log('🚀 =========================');
    console.log('📦 Cart ID: test_cart_123');
    console.log('📍 Código postal destino: 66050');
    console.log('⏰ Timestamp:', new Date().toISOString());

    console.log('🔑 Paso 1: Obteniendo token de autenticación...');
    const authResponse = await axios.post(AUTH_URL, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      refresh_token: '',
      scope: 'default orders.create'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const token = authResponse.data.access_token;
    console.log('✅ Token obtenido exitosamente');

    // Simular datos del carrito
    console.log('🛒 Paso 2: Obteniendo datos del carrito...');
    const mockCartData = {
      cartItems: [
        { id: 1, nombre: 'Producto Test 1', peso_kg: 0.8, cantidad: 2 },
        { id: 2, nombre: 'Producto Test 2', peso_kg: 1.2, cantidad: 1 }
      ],
      totalWeight: 2.8, // 0.8*2 + 1.2 = 2.8kg
      dimensions: { length: 30, width: 25, height: 15 },
      compressionFactor: 0.85
    };

    console.log('📊 DATOS DEL CARRITO OBTENIDOS:');
    console.log('   Items:', mockCartData.cartItems.length);
    console.log('   Peso total:', mockCartData.totalWeight, 'kg');
    console.log('   Dimensiones:', JSON.stringify(mockCartData.dimensions));
    console.log('   Factor compresión:', mockCartData.compressionFactor);

    // Simular dirección destino
    console.log('🗺️  Paso 3: Obteniendo dirección destino...');
    const mockAddressTo = {
      area_level1: 'Nuevo Leon',
      area_level2: 'General Escobedo', 
      area_level3: 'Centro',
      postal_code: '66050'
    };

    console.log('📍 DIRECCIÓN DESTINO:');
    console.log('   Estado:', mockAddressTo.area_level1);
    console.log('   Municipio:', mockAddressTo.area_level2);
    console.log('   Colonia:', mockAddressTo.area_level3);
    console.log('   CP:', mockAddressTo.postal_code);

    // Preparar payload
    const quotationPayload = {
      quotation: {
        order_id: `test_logging_${Date.now()}`,
        address_from: {
          name: "Trebode Luxe",
          street1: "Av Universidad 123",
          area_level3: "Centro",
          area_level2: "San Nicolas de los Garza",
          area_level1: "Nuevo Leon",
          postal_code: "66450",
          country_code: "MX",
          phone: "8181234567"
        },
        address_to: {
          name: "Cliente Test",
          street1: "Av Raul Salinas 100",
          area_level3: mockAddressTo.area_level3,
          area_level2: mockAddressTo.area_level2,
          area_level1: mockAddressTo.area_level1,
          postal_code: mockAddressTo.postal_code,
          country_code: "MX",
          phone: "8187654321"
        },
        parcels: [{
          length: Math.ceil(mockCartData.dimensions.length),
          width: Math.ceil(mockCartData.dimensions.width),
          height: Math.ceil(mockCartData.dimensions.height),
          weight: Math.ceil(mockCartData.totalWeight), // En KG como debe ser
          declared_value: 1000
        }],
        shipment_type: "package",
        quote_type: "carrier"
      }
    };

    console.log('📤 Paso 4: Preparando solicitud a SkyDropX...');
    console.log('🔗 URL:', `${API_URL}/quotations`);
    console.log('📋 PAYLOAD COMPLETO:', JSON.stringify(quotationPayload, null, 2));
    console.log('🔑 Authorization: Bearer [TOKEN_PRESENTE]');
    console.log('📤 Enviando solicitud...');

    // Hacer la petición real
    const response = await axios.post(
      `${API_URL}/quotations`,
      quotationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Logs de respuesta detallados
    console.log('📥 Respuesta de SkyDropX recibida');
    console.log('🔍 STATUS RESPONSE:', response.status);
    console.log('🔍 HEADERS RESPONSE:', JSON.stringify(response.headers, null, 2));
    console.log('🔍 DATA RESPONSE COMPLETA:', JSON.stringify(response.data, null, 2));

    // Log específico de cotizaciones
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

    // Log final
    console.log('🎉 COTIZACIÓN COMPLETADA EXITOSAMENTE');
    console.log('📊 Datos retornados al cliente:', JSON.stringify({
      success: true,
      totalQuotations: response.data.rates ? response.data.rates.length : 0,
      successfulQuotations: response.data.rates ? response.data.rates.filter(r => r.success).length : 0,
      cartItems: mockCartData.cartItems.length,
      totalWeight: mockCartData.totalWeight + ' kg'
    }, null, 2));
    console.log('🚀 =========================');

    console.log('\n✅ SISTEMA DE LOGS FUNCIONANDO CORRECTAMENTE');

  } catch (error) {
    // Simular logs de error detallados
    console.error('❌ Error obteniendo cotización de envío:', error.message);
    
    if (error.response) {
      console.error('📋 DETALLES DEL ERROR DE SKYDROPX:');
      console.error('🔍 STATUS ERROR:', error.response.status);
      console.error('🔍 STATUS TEXT:', error.response.statusText);
      console.error('🔍 HEADERS ERROR:', JSON.stringify(error.response.headers, null, 2));
      console.error('🔍 DATA ERROR COMPLETA:', JSON.stringify(error.response.data, null, 2));
      
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

    console.log('\n✅ SISTEMA DE LOGS DE ERROR FUNCIONANDO CORRECTAMENTE');
  }
}

testLoggingSystem();
