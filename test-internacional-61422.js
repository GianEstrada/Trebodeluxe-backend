const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testCP61422Internacional() {
  try {
    console.log('🌍 TEST CÓDIGO POSTAL INTERNACIONAL 61422');
    console.log('==========================================\n');
    
    const shippingService = new ShippingQuoteService();
    
    console.log('🔍 Probando CP: 61422');
    console.log('📍 Verificando detección automática de país...\n');
    
    // Test 1: Detección de país
    const detectedCountry = shippingService.detectCountryFromPostalCode('61422');
    console.log(`🌍 País detectado: ${detectedCountry.toUpperCase()}`);
    
    // Test 2: Obtener datos de dirección
    console.log('\n📍 Obteniendo datos de dirección...');
    const addressData = await shippingService.getAddressFromPostalCode('61422');
    
    console.log('\n✅ RESULTADO FINAL:');
    console.log('===================');
    console.log('📍 Estado/Provincia:', addressData.area_level1);
    console.log('🏙️  Ciudad/Municipio:', addressData.area_level2);
    console.log('🏘️  Área/Colonia:', addressData.area_level3);
    console.log('🆔 CP:', addressData.postal_code);
    console.log('🌍 País:', addressData.country_code);
    
    console.log('\n📋 DATOS COMPLETOS:');
    console.log(JSON.stringify(addressData, null, 2));
    
    // Test 3: Verificar que los datos son correctos para USA
    if (addressData.country_code === 'US') {
      console.log('\n✅ VERIFICACIÓN: CP detectado correctamente como USA');
      console.log('🏛️  Este CP debería corresponder a una ciudad en Estados Unidos');
    } else {
      console.log('\n⚠️  ADVERTENCIA: CP no detectado como USA');
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error('🔍 Stack:', error.stack);
  }
}

// Ejecutar el test
testCP61422Internacional();
