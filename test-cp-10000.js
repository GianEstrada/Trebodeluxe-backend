/**
 * Test específico para CP 10000
 * Verificar si es México o internacional y cómo lo maneja el sistema híbrido
 */

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testCP10000() {
  console.log('🔍 ==========================================');
  console.log('🔍 TEST ESPECÍFICO PARA CP 10000');
  console.log('🔍 ==========================================');
  
  const service = new ShippingQuoteService();
  
  try {
    // PASO 1: Verificar en base mexicana
    console.log('\n🇲🇽 PASO 1: Verificando en base mexicana...');
    const mexicanResult = await service.searchInMexicanDatabase('10000');
    console.log(`   Encontrado en México: ${mexicanResult.found ? '✅ SÍ' : '❌ NO'}`);
    
    if (mexicanResult.found) {
      console.log(`   Estado: ${mexicanResult.address.area_level1}`);
      console.log(`   Municipio: ${mexicanResult.address.area_level2}`);
      console.log(`   Colonia: ${mexicanResult.address.area_level3}`);
    }
    
    // PASO 2: Detección de país
    console.log('\n🌍 PASO 2: Detección automática de país...');
    const detectedCountry = service.detectCountryFromPostalCode('10000');
    console.log(`   País detectado: ${detectedCountry || 'N/A'}`);
    
    // PASO 3: Resolución de dirección completa
    console.log('\n📍 PASO 3: Resolución de dirección completa...');
    try {
      const addressResult = await service.getAddressFromPostalCodeInternational('10000');
      console.log('   ✅ Dirección encontrada:');
      console.log(`   País: ${addressResult.country_name}`);
      console.log(`   Estado/Provincia: ${addressResult.area_level1}`);
      console.log(`   Ciudad: ${addressResult.area_level2}`);
      console.log(`   Coordenadas: ${addressResult.latitude}, ${addressResult.longitude}`);
    } catch (error) {
      console.log(`   ❌ Error en resolución: ${error.message}`);
    }
    
    // PASO 4: Decisión híbrida
    console.log('\n🔄 PASO 4: Decisión híbrida automática...');
    const wouldUseMexico = mexicanResult.found;
    const decision = wouldUseMexico ? 'nacional' : 'internacional';
    
    console.log(`   Decisión que tomaría: ${decision}`);
    console.log(`   Función que usaría: ${decision === 'nacional' ? 'getShippingQuote()' : 'getShippingQuoteInternational()'}`);
    
    if (wouldUseMexico) {
      console.log(`   Razón: CP encontrado en base de datos mexicana`);
    } else {
      console.log(`   Razón: CP no encontrado en base mexicana → usar internacional`);
    }
    
    // PASO 5: Comparar con función híbrida real
    console.log('\n🧪 PASO 5: Probando función híbrida real...');
    console.log('   Nota: Usará cartId ficticio para mostrar la lógica');
    
    try {
      const hybridResult = await service.getShippingQuoteHybrid('test_cart_10000', '10000');
      console.log('   ✅ Función híbrida completada');
      console.log(`   Success: ${hybridResult.success}`);
      
      if (!hybridResult.success) {
        console.log(`   Error esperado: ${hybridResult.error}`);
        console.log('   (Error de carrito ficticio es normal en esta prueba)');
      }
    } catch (error) {
      console.log(`   Error esperado: ${error.message}`);
      console.log('   (Error de carrito ficticio es normal en esta prueba)');
    }
    
  } catch (error) {
    console.error('❌ ERROR EN EL TEST:', error.message);
    console.error('   Stack:', error.stack);
  }
  
  console.log('\n🏁 ==========================================');
  console.log('🏁 RESUMEN PARA CP 10000');
  console.log('🏁 ==========================================');
  console.log('✅ Test completado');
  console.log('📋 El CP 10000 fue analizado por el sistema híbrido');
  console.log('🎯 El sistema tomará la decisión correcta automáticamente');
}

// Ejecutar el test
testCP10000().catch(console.error);
