#!/usr/bin/env node

/**
 * Test completo de cotizaciones SkyDropX PRO
 */

const axios = require('axios');

async function testSkyDropXQuotations() {
  console.log('📦 TEST DE COTIZACIONES SKYDROPX PRO');
  console.log('===================================\n');

  const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
  const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
  const AUTH_URL = 'https://pro.skydropx.com/api/v1/oauth/token';
  const API_URL = 'https://pro.skydropx.com/api/v1';

  try {
    // Paso 1: Obtener token
    console.log('🔑 Paso 1: Obteniendo Bearer token...');
    
    const authResponse = await axios.post(AUTH_URL, {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Token obtenido - Expira en: ${authResponse.data.expires_in} segundos\n`);

    // Paso 2: Crear cotización de prueba
    console.log('📝 Paso 2: Creando cotización de prueba...');
    
    const quotationPayload = {
      quotation: {
        order_id: `test_${Date.now()}`,
        address_from: {
          name: "Trebode Luxe",
          company: "Trebode Luxe",
          street1: "Calle Principal 123",
          area_level3: "Centro", // Colonia
          area_level2: "Ciudad de México", // Ciudad
          area_level1: "Ciudad de México", // Estado
          postal_code: "01000",
          country_code: "MX",
          phone: "5555555555"
        },
        address_to: {
          name: "Cliente Test",
          street1: "Calle Destino 456",
          area_level3: "Centro", // Colonia
          area_level2: "Guadalajara", // Ciudad  
          area_level1: "Jalisco", // Estado
          postal_code: "44100",
          country_code: "MX",
          phone: "3333333333"
        },
        parcels: [
          {
            length: 30,
            width: 20,
            height: 10,
            weight: 2,
            declared_value: 1000
          }
        ],
        requested_carriers: ["fedex", "dhl", "paquetexpress"],
        shipment_type: "package",
        quote_type: "carrier"
      }
    };

    console.log('📤 Enviando cotización:');
    console.log(JSON.stringify(quotationPayload, null, 2));
    console.log('');

    const quotationResponse = await axios.post(
      `${API_URL}/quotations`,
      quotationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authResponse.data.access_token}`
        }
      }
    );

    console.log('✅ ¡COTIZACIÓN EXITOSA!');
    console.log(`   Status: ${quotationResponse.status}`);
    console.log('   Respuesta:');
    console.log(JSON.stringify(quotationResponse.data, null, 2));

  } catch (error) {
    console.log('❌ ERROR:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   URL: ${error.config?.url}`);
    console.log('   Error data:');
    console.log(JSON.stringify(error.response?.data, null, 2));
  }

  console.log('\n🏁 Test completado');
}

testSkyDropXQuotations().catch(console.error);
