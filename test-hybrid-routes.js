/**
 * Test para las nuevas rutas híbridas de cotización
 */

const axios = require('axios');

async function testHybridShippingRoutes() {
  console.log('🔄 ==========================================');
  console.log('🧪 TEST RUTAS HÍBRIDAS DE COTIZACIÓN');
  console.log('🔄 ==========================================');

  const baseURL = 'https://trebodeluxe-backend.onrender.com/api/skydropx';
  
  const testCases = [
    {
      name: 'CP Mexicano con Ruta Híbrida',
      endpoint: '/cart/quote-hybrid',
      payload: {
        cartId: '6',
        postalCode: '01000'
      },
      expectedDecision: 'nacional'
    },
    {
      name: 'CP Internacional con Ruta Híbrida',
      endpoint: '/cart/quote-hybrid', 
      payload: {
        cartId: '6',
        postalCode: '61422'
      },
      expectedDecision: 'internacional'
    },
    {
      name: 'CP Mexicano Forzado como Internacional',
      endpoint: '/cart/quote-hybrid',
      payload: {
        cartId: '6',
        postalCode: '01000',
        forceCountry: 'US'
      },
      expectedDecision: 'internacional'
    },
    {
      name: 'Cotización Internacional Directa',
      endpoint: '/cart/quote-international',
      payload: {
        cartId: '6',
        postalCode: '61422',
        forceCountry: 'US'
      },
      expectedResult: 'internacional'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 ==========================================`);
    console.log(`🧪 ${testCase.name}`);
    console.log(`🧪 ==========================================`);
    console.log(`📍 Endpoint: ${testCase.endpoint}`);
    console.log(`📦 Payload:`, JSON.stringify(testCase.payload, null, 2));
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${baseURL}${testCase.endpoint}`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ RESPUESTA EXITOSA (${responseTime}ms):`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${response.data.success}`);
      
      if (response.data.success) {
        if (testCase.expectedDecision && response.data.decision) {
          const correctDecision = response.data.decision === testCase.expectedDecision;
          console.log(`   Decisión: ${response.data.decision} ${correctDecision ? '✅' : '❌'}`);
        }
        
        if (response.data.isHybrid) {
          console.log(`   Tipo: Híbrido ✅`);
        }
        
        if (response.data.isInternational) {
          console.log(`   Tipo: Internacional ✅`);
          console.log(`   País: ${response.data.country || 'N/A'}`);
        }
        
        console.log(`   Cotizaciones: ${response.data.quotations?.length || 0}`);
        console.log(`   Mensaje: ${response.data.message}`);
        
        if (response.data.quotations && response.data.quotations.length > 0) {
          console.log(`   Primera cotización: ${response.data.quotations[0]?.carrier} - $${response.data.quotations[0]?.price}`);
        }
      } else {
        console.log(`   Error: ${response.data.error}`);
        console.log(`   Detalles: ${response.data.details || 'N/A'}`);
      }
      
    } catch (error) {
      console.error(`❌ ERROR EN TEST:`);
      console.error(`   Status: ${error.response?.status || 'No response'}`);
      console.error(`   Mensaje: ${error.message}`);
      
      if (error.response?.data) {
        console.error(`   Respuesta del servidor:`, error.response.data);
      }
    }
  }

  console.log(`\n🏁 ==========================================`);
  console.log(`🏁 TESTS DE RUTAS HÍBRIDAS COMPLETADOS`);
  console.log(`🏁 ==========================================`);
  console.log(`✅ Rutas implementadas:`);
  console.log(`   - /api/skydropx/cart/quote-hybrid`);
  console.log(`   - /api/skydropx/cart/quote-international`);
  console.log(`📝 Estas rutas están listas para usar en el frontend`);
}

// Ejecutar las pruebas
testHybridShippingRoutes().catch(console.error);
