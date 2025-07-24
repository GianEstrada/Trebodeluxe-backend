const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function testIndexImagesAPI() {
  const baseURL = 'https://trebodeluxe-backend.onrender.com';
  
  console.log('🧪 Probando API de imágenes index...\n');
  
  try {
    // Test 1: Obtener todas las imágenes
    console.log('📋 Test 1: Obtener todas las imágenes index');
    const response1 = await makeRequest(`${baseURL}/api/admin/index-images`);
    console.log('✅ Respuesta exitosa:', response1.success);
    console.log('📊 Número de imágenes:', response1.images?.length || 0);
    
    if (response1.images && response1.images.length > 0) {
      console.log('\n📝 Detalle de imágenes:');
      response1.images.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.nombre} (${img.seccion} - ${img.estado})`);
      });
    }
    
    // Test 2: Filtrar por sección principal
    console.log('\n📋 Test 2: Filtrar imágenes principales');
    const response2 = await makeRequest(`${baseURL}/api/admin/index-images?seccion=principal`);
    console.log('✅ Imágenes principales:', response2.images?.length || 0);
    
    // Test 3: Filtrar por sección banner
    console.log('\n📋 Test 3: Filtrar imágenes de banner');
    const response3 = await makeRequest(`${baseURL}/api/admin/index-images?seccion=banner`);
    console.log('✅ Imágenes de banner:', response3.images?.length || 0);
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
testIndexImagesAPI();
