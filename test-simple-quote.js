const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/skydropx';

// Test simple y directo
async function testSimpleQuote() {
  console.log('🧪 ==============================');
  console.log('🧪 TEST RUTA HÍBRIDA SIMPLE');
  console.log('🧪 ==============================\n');

  try {
    const payload = {
      cartId: "1",  // Usar un ID simple
      postalCode: "01000"  // CP mexicano válido
    };
    
    console.log('📍 Endpoint:', '/cart/quote-hybrid');
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    console.log('🔄 Enviando solicitud...');
    const response = await axios.post(`${BASE_URL}/cart/quote-hybrid`, payload, {
      timeout: 30000,  // 30 segundos de timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ ¡RESPUESTA EXITOSA!');
    console.log('   Status:', response.status);
    console.log('   Success:', response.data.success);
    
    if (response.data.success) {
      console.log('   Tipo:', response.data.isHybrid ? 'Híbrido ✨' : 'Normal');
      console.log('   Decisión:', response.data.decision || 'N/A');
      console.log('   Mensaje:', response.data.message);
      
      if (response.data.quotations && response.data.quotations.length > 0) {
        console.log('   Cotizaciones encontradas:', response.data.quotations.length);
        console.log('   Primera cotización:', response.data.quotations[0]);
      }
    } else {
      console.log('   Error:', response.data.message);
    }
    
  } catch (error) {
    console.log('\n❌ ERROR EN TEST:');
    console.log('   Código:', error.code || 'Sin código');
    console.log('   Mensaje:', error.message);
    
    if (error.response) {
      console.log('   Status HTTP:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('   Sin respuesta del servidor');
      console.log('   ¿Está el servidor corriendo en puerto 5000?');
    }
  }
  
  console.log('\n🏁 Test completado');
}

testSimpleQuote();
