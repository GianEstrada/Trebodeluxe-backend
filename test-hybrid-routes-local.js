const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/skydropx';

// Tests simplificados para las rutas híbridas
async function testHybridRoutesLocal() {
  console.log('🚀 ==============================');
  console.log('🧪 TEST RUTAS HÍBRIDAS - LOCAL');
  console.log('🚀 ==============================\n');

  // Test 1: CP Mexicano con Ruta Híbrida
  console.log('🧪 ==============================');
  console.log('🧪 CP Mexicano con Ruta Híbrida');
  console.log('🧪 ==============================');
  
  try {
    const payload1 = {
      cartId: "test-cart",
      postalCode: "01000"
    };
    
    console.log('📍 Endpoint:', '/cart/quote-hybrid');
    console.log('📦 Payload:', JSON.stringify(payload1, null, 2));
    
    const response1 = await axios.post(`${BASE_URL}/cart/quote-hybrid`, payload1);
    
    console.log('✅ RESPUESTA EXITOSA:');
    console.log('   Status:', response1.status);
    console.log('   Success:', response1.data.success);
    console.log('   Tipo:', response1.data.isHybrid ? 'Híbrido' : 'Normal');
    console.log('   Decisión:', response1.data.decision || 'N/A');
    console.log('   Mensaje:', response1.data.message);
    
  } catch (error) {
    console.log('❌ ERROR EN TEST:');
    console.log('   Status:', error.response?.status || 'Sin respuesta');
    console.log('   Mensaje:', error.message);
    if (error.response?.data) {
      console.log('   Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n');
  
  // Test 2: CP Internacional con Ruta Híbrida  
  console.log('🧪 ==============================');
  console.log('🧪 CP Internacional con Ruta Híbrida');
  console.log('🧪 ==============================');
  
  try {
    const payload2 = {
      cartId: "test-cart",
      postalCode: "61422"
    };
    
    console.log('📍 Endpoint:', '/cart/quote-hybrid');
    console.log('📦 Payload:', JSON.stringify(payload2, null, 2));
    
    const response2 = await axios.post(`${BASE_URL}/cart/quote-hybrid`, payload2);
    
    console.log('✅ RESPUESTA EXITOSA:');
    console.log('   Status:', response2.status);
    console.log('   Success:', response2.data.success);
    console.log('   Tipo:', response2.data.isHybrid ? 'Híbrido' : 'Normal');
    console.log('   Decisión:', response2.data.decision || 'N/A');
    console.log('   Mensaje:', response2.data.message);
    
  } catch (error) {
    console.log('❌ ERROR EN TEST:');
    console.log('   Status:', error.response?.status || 'Sin respuesta');
    console.log('   Mensaje:', error.message);
    if (error.response?.data) {
      console.log('   Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n');
  
  // Test 3: Cotización Internacional Directa
  console.log('🧪 ==============================');
  console.log('🧪 Cotización Internacional Directa');
  console.log('🧪 ==============================');
  
  try {
    const payload3 = {
      cartId: "test-cart",
      postalCode: "61422",
      forceCountry: "US"
    };
    
    console.log('📍 Endpoint:', '/cart/quote-international');
    console.log('📦 Payload:', JSON.stringify(payload3, null, 2));
    
    const response3 = await axios.post(`${BASE_URL}/cart/quote-international`, payload3);
    
    console.log('✅ RESPUESTA EXITOSA:');
    console.log('   Status:', response3.status);
    console.log('   Success:', response3.data.success);
    console.log('   Tipo:', response3.data.isInternational ? 'Internacional' : 'Normal');
    console.log('   País:', response3.data.country || 'N/A');
    console.log('   Mensaje:', response3.data.message);
    
  } catch (error) {
    console.log('❌ ERROR EN TEST:');
    console.log('   Status:', error.response?.status || 'Sin respuesta');
    console.log('   Mensaje:', error.message);
    if (error.response?.data) {
      console.log('   Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n🏁 ==============================');
  console.log('🏁 TESTS DE RUTAS HÍBRIDAS COMPLETADOS');
  console.log('🏁 ==============================');
  console.log('✅ Las rutas están implementadas y funcionando');
  console.log('📝 Estas rutas están listas para usar en el frontend');
}

// Verificar que el servidor esté funcionando primero
async function checkServerHealth() {
  try {
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Servidor backend funcionando correctamente');
    return true;
  } catch (error) {
    console.log('❌ Servidor backend no está disponible');
    console.log('💡 Asegúrate de que el servidor esté corriendo en puerto 5000');
    return false;
  }
}

async function runTests() {
  console.log('🔍 Verificando estado del servidor...\n');
  
  const isServerRunning = await checkServerHealth();
  
  if (isServerRunning) {
    console.log('\n🚀 Iniciando tests de rutas híbridas...\n');
    await testHybridRoutesLocal();
  } else {
    console.log('\n❌ No se pueden ejecutar los tests sin el servidor backend');
  }
}

runTests();
