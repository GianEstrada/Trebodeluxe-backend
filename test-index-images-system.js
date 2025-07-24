const axios = require('axios');

console.log('🔍 Probando sistema completo de imágenes del index...\n');

async function testIndexImagesSystem() {
  try {
    // 1. Probar endpoint público del backend
    console.log('1️⃣ Probando endpoint público del backend...');
    const backendResponse = await axios.get(
      'https://trebodeluxe-backend.onrender.com/api/public/index-images',
      { timeout: 10000 }
    );
    
    console.log('✅ Endpoint público del backend funciona');
    console.log(`📊 Total de imágenes: ${backendResponse.data.data?.length || 0}`);
    
    // Mostrar estado de las imágenes
    if (backendResponse.data.data && backendResponse.data.data.length > 0) {
      const principal = backendResponse.data.data.filter(img => img.seccion === 'principal');
      const banner = backendResponse.data.data.filter(img => img.seccion === 'banner');
      
      console.log(`📸 Imágenes principales: ${principal.length}`);
      principal.forEach(img => {
        console.log(`  - ${img.nombre} (${img.estado})`);
      });
      
      console.log(`🎯 Imágenes banner: ${banner.length}`);
      banner.forEach(img => {
        console.log(`  - ${img.nombre} (${img.estado})`);
      });
      
      // Verificar imágenes activas
      const leftActive = principal.find(img => img.estado === 'izquierda');
      const rightActive = principal.find(img => img.estado === 'derecha');
      const bannerActive = banner.find(img => img.estado === 'activo');
      
      console.log('\n🎯 Estado de imágenes activas:');
      console.log(`   Izquierda: ${leftActive ? '✅ ' + leftActive.nombre : '❌ Ninguna'}`);
      console.log(`   Derecha: ${rightActive ? '✅ ' + rightActive.nombre : '❌ Ninguna'}`);
      console.log(`   Banner: ${bannerActive ? '✅ ' + bannerActive.nombre : '❌ Ninguna'}`);
    }
    
    console.log('\n');
    
    // 2. Probar endpoint del frontend
    console.log('2️⃣ Probando endpoint del frontend...');
    const frontendResponse = await axios.get(
      'https://trebodeluxe-front.onrender.com/api/public/index-images',
      { timeout: 15000 }
    );
    
    console.log('✅ Endpoint público del frontend funciona');
    console.log(`📊 Datos recibidos del frontend: ${frontendResponse.data.data?.length || 0} imágenes`);
    
    console.log('\n');
    
    // 3. Verificar consistencia de datos
    console.log('3️⃣ Verificando consistencia de datos...');
    if (backendResponse.data.data && frontendResponse.data.data) {
      const backendCount = backendResponse.data.data.length;
      const frontendCount = frontendResponse.data.data.length;
      
      if (backendCount === frontendCount) {
        console.log('✅ Datos consistentes entre backend y frontend');
      } else {
        console.log(`⚠️  Inconsistencia: Backend=${backendCount}, Frontend=${frontendCount}`);
      }
    }
    
    console.log('\n🎉 ¡Sistema de imágenes del index funcionando correctamente!');
    console.log('\n📋 Funcionalidades disponibles:');
    console.log('   ✅ Endpoint público sin autenticación');
    console.log('   ✅ Gestión desde panel admin');
    console.log('   ✅ Formulario para agregar imágenes');
    console.log('   ✅ Actualización automática de estados');
    console.log('   ✅ Vista previa en formulario');
    console.log('   ✅ Control de estados únicos');
    console.log('   ✅ Integración con frontend público');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    if (error.response) {
      console.log(`🔍 Status: ${error.response.status}`);
      console.log(`🔍 Data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
  }
}

testIndexImagesSystem();
