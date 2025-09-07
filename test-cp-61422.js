#!/usr/bin/env node

/**
 * Test específico para CP 61422
 */

// Simular variables de entorno
process.env.SKYDROP_API_KEY = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
process.env.SKYDROP_API_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testCP61422() {
  console.log('🧪 TEST ESPECÍFICO PARA CP 61422');
  console.log('=================================\n');

  try {
    const shippingService = new ShippingQuoteService();
    
    console.log('🔍 Probando CP: 61422');
    console.log('📍 Verificando en qué fuente se encuentra...\n');

    const result = await shippingService.getAddressFromPostalCode('61422');
    
    console.log('\n✅ RESULTADO FINAL:');
    console.log('===================');
    console.log('📍 Estado:', result.area_level1);
    console.log('🏙️  Municipio:', result.area_level2);
    console.log('🏘️  Colonia:', result.area_level3);
    console.log('🆔 CP:', result.postal_code);
    console.log('🌍 País:', result.country_code);

    console.log('\n📋 DATOS COMPLETOS:');
    console.log(JSON.stringify(result, null, 2));

    // Ahora vamos a hacer una prueba de cotización completa con este CP
    console.log('\n🚚 PROBANDO COTIZACIÓN COMPLETA CON CP 61422');
    console.log('==============================================');

    // Simular una cotización desde Monterrey hacia 61422
    const axios = require('axios');
    
    // Obtener token
    const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
    const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
    const AUTH_URL = 'https://pro.skydropx.com/api/v1/oauth/token';
    const API_URL = 'https://pro.skydropx.com/api/v1';

    console.log('🔑 Obteniendo token...');
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
    console.log('✅ Token obtenido');

    // Cotización de prueba
    const quotationPayload = {
      quotation: {
        order_id: `test_61422_${Date.now()}`,
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
          name: "Cliente CP 61422",
          street1: "Calle Principal 100",
          area_level3: result.area_level3,
          area_level2: result.area_level2,
          area_level1: result.area_level1,
          postal_code: result.postal_code,
          country_code: "MX",
          phone: "5551234567"
        },
        parcels: [{
          length: 25,
          width: 20,
          height: 15,
          weight: 2, // 2kg
          declared_value: 1000
        }],
        shipment_type: "package",
        quote_type: "carrier"
      }
    };

    console.log('📤 Enviando cotización...');
    console.log('📍 Origen: San Nicolás, NL (66450)');
    console.log(`📍 Destino: ${result.area_level2}, ${result.area_level1} (61422)`);

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

    console.log('✅ Cotización exitosa!');
    
    const successfulRates = response.data.rates.filter(rate => rate.success === true);
    const failedRates = response.data.rates.filter(rate => rate.success === false);

    console.log(`\n📊 RESULTADOS:`);
    console.log(`   Total evaluadas: ${response.data.rates.length}`);
    console.log(`   Exitosas: ${successfulRates.length}`);
    console.log(`   Fallidas: ${failedRates.length}`);

    if (successfulRates.length > 0) {
      console.log('\n💰 COTIZACIONES DISPONIBLES:');
      successfulRates
        .sort((a, b) => parseFloat(a.total) - parseFloat(b.total))
        .forEach((rate, index) => {
          console.log(`${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}`);
          console.log(`   💲 Precio: $${rate.total} ${rate.currency_code}`);
          console.log(`   ⏱️  Tiempo: ${rate.days} día(s)`);
          console.log('');
        });
    } else {
      console.log('\n❌ No se encontraron cotizaciones disponibles');
      console.log('\n🔍 ERRORES PRINCIPALES:');
      const uniqueErrors = [...new Set(failedRates
        .filter(rate => rate.error_messages && rate.error_messages.length > 0)
        .map(rate => rate.error_messages[0].error_message))];
      
      uniqueErrors.slice(0, 3).forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    console.log('\n✅ TEST COMPLETADO PARA CP 61422');

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    if (error.response?.data) {
      console.log('\n🔍 Detalles del error:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCP61422();
