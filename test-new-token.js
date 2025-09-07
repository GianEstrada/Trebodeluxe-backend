const axios = require('axios');
require('dotenv').config();

async function testSkyDropXNewToken() {
  console.log('🔐 ==========================================');
  console.log('🔐 TESTING AUTENTICACIÓN SKYDROPX CON TOKEN NUEVO');
  console.log('🔐 ==========================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  try {
    // Paso 1: Obtener token de autenticación NUEVO
    console.log('🎯 Paso 1: Obteniendo token de autenticación FRESCO...');
    console.log('📍 URL:', 'https://pro.skydropx.com/api/v1/auth/token');
    console.log('📋 Credenciales:');
    console.log('   📧 Email:', process.env.SKYDROPX_EMAIL || 'NO_DEFINIDO');
    console.log('   🔑 API Key:', process.env.SKYDROPX_API_KEY ? 'PRESENTE' : 'NO_DEFINIDO');
    console.log('');

    const authPayload = {
      email: process.env.SKYDROPX_EMAIL,
      api_key: process.env.SKYDROPX_API_KEY
    };

    console.log('📤 Payload de autenticación:');
    console.log(JSON.stringify(authPayload, null, 2));
    console.log('');

    const authResponse = await axios.post('https://pro.skydropx.com/api/v1/auth/token', authPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ AUTENTICACIÓN EXITOSA');
    console.log('📥 Status:', authResponse.status);
    console.log('📥 Data:');
    console.log(JSON.stringify(authResponse.data, null, 2));
    console.log('');

    const bearerToken = authResponse.data.token;
    console.log('🎫 Bearer Token generado:', bearerToken ? 'PRESENTE' : 'NO_PRESENTE');
    console.log('🎫 Token (primeros 20 chars):', bearerToken ? bearerToken.substring(0, 20) + '...' : 'N/A');
    console.log('');

    // Paso 2: Probar cotización con token nuevo
    console.log('🎯 Paso 2: Probando cotización con token fresco...');
    
    const quotationPayload = {
      quotation: {
        order_id: `test_new_token_${Date.now()}`,
        address_from: {
          country_code: "MX",
          postal_code: "64000",
          area_level1: "Nuevo León",
          area_level2: "Monterrey",
          area_level3: "Monterrey Centro"
        },
        address_to: {
          country_code: "US",
          postal_code: "61422",
          area_level1: "Illinois",
          area_level2: "Bushnell",
          area_level3: "Bushnell"
        },
        parcels: [
          {
            length: 30,
            width: 20,
            height: 10,
            weight: 1,
            products: [
              {
                hs_code: "6110.20.20",
                description_en: "Cotton sweatshirt",
                country_code: "MX",
                quantity: 1,
                price: 600
              }
            ]
          }
        ],
        shipment_type: "package",
        quote_type: "carrier"
      }
    };

    console.log('📤 Payload de cotización:');
    console.log(JSON.stringify(quotationPayload, null, 2));
    console.log('');

    console.log('📡 Enviando solicitud a SkyDropX...');
    const quotationResponse = await axios.post('https://pro.skydropx.com/api/v1/quotations', quotationPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      }
    });

    console.log('✅ COTIZACIÓN EXITOSA');
    console.log('📥 Status:', quotationResponse.status);
    console.log('📥 Data:');
    console.log(JSON.stringify(quotationResponse.data, null, 2));

  } catch (error) {
    console.error('❌ ERROR EN TESTING:');
    console.error('❌ ==========================================');
    
    if (error.response) {
      console.error('📥 Status:', error.response.status);
      console.error('📥 Status Text:', error.response.statusText);
      console.error('📥 Data:');
      console.error(JSON.stringify(error.response.data, null, 2));
      
      // Si es error 422, analizar en detalle los códigos HS
      if (error.response.status === 422) {
        console.error('');
        console.error('🏛️ ANÁLISIS DE CÓDIGOS HS:');
        console.error('🏛️ ==========================================');
        const errors = error.response.data.errors;
        if (errors && errors.products) {
          errors.products.forEach((productError, index) => {
            console.error(`❌ Producto ${index + 1}: ${productError}`);
          });
        }
        console.error('🏛️ El código 6110.20.20 NO ES VÁLIDO en SkyDropX');
        console.error('🏛️ Necesitamos encontrar códigos HS diferentes');
      }
    } else if (error.request) {
      console.error('📡 No response received:');
      console.error(error.request);
    } else {
      console.error('🔧 Error setting up request:');
      console.error(error.message);
    }
  }

  console.log('');
  console.log('🔐 ==========================================');
  console.log('🔐 TESTING AUTENTICACIÓN COMPLETADO');
  console.log('🔐 ==========================================');
}

// Ejecutar test
testSkyDropXNewToken();
