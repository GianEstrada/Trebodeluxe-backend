// Test simple para validar las APIs de imágenes index
const axios = require('axios');

async function testIndexImagesAPI() {
  const baseURL = 'https://trebodeluxe-backend.onrender.com';
  
  console.log('🧪 Probando API de imágenes index...\n');
  
  try {
    // Test 1: Obtener todas las imágenes
    console.log('📋 Test 1: Obtener todas las imágenes index');
    const response1 = await axios.get(`${baseURL}/api/admin/index-images`);
    console.log('✅ Respuesta exitosa:', response1.data);
    console.log('📊 Número de imágenes:', response1.data.images?.length || 0);
    
    if (response1.data.images && response1.data.images.length > 0) {
      console.log('\n📝 Detalle de imágenes:');
      response1.data.images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.nombre} (${img.seccion} - ${img.estado})`);
      });
    }
    
    // Test 2: Filtrar por sección principal
    console.log('\n📋 Test 2: Filtrar imágenes principales');
    const response2 = await axios.get(`${baseURL}/api/admin/index-images?seccion=principal`);
    console.log('✅ Imágenes principales:', response2.data.images?.length || 0);
    
    // Test 3: Filtrar por sección banner
    console.log('\n📋 Test 3: Filtrar imágenes de banner');
    const response3 = await axios.get(`${baseURL}/api/admin/index-images?seccion=banner`);
    console.log('✅ Imágenes de banner:', response3.data.images?.length || 0);
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
  }
}

// Ejecutar las pruebas
testIndexImagesAPI();
