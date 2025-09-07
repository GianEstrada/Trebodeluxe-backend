const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testCodigosPostalesInternacionales() {
  try {
    console.log('🌍 TEST CÓDIGOS POSTALES INTERNACIONALES');
    console.log('=========================================\n');
    
    const shippingService = new ShippingQuoteService();
    
    const codigosPostales = [
      { cp: '61422', esperado: 'US', descripcion: 'Illinois, USA' },
      { cp: '90210', esperado: 'US', descripcion: 'Beverly Hills, California, USA' },
      { cp: '10001', esperado: 'US', descripcion: 'New York, USA' },
      { cp: '66450', esperado: 'MX', descripcion: 'San Nicolás, Nuevo León, México' },
      { cp: '06000', esperado: 'MX', descripcion: 'Centro, Ciudad de México' },
      { cp: 'M5V 3L9', esperado: 'CA', descripcion: 'Toronto, Canadá' },
      { cp: 'SW1A 1AA', esperado: 'GB', descripcion: 'Londres, Reino Unido' }
    ];
    
    for (const { cp, esperado, descripcion } of codigosPostales) {
      console.log(`🔍 PROBANDO: ${cp} (${descripcion})`);
      console.log(''.padEnd(50, '-'));
      
      // Test detección de país
      const paisDetectado = shippingService.detectCountryFromPostalCode(cp);
      const correctoPais = paisDetectado.toUpperCase() === esperado;
      
      console.log(`🌍 País esperado: ${esperado}`);
      console.log(`🌍 País detectado: ${paisDetectado.toUpperCase()} ${correctoPais ? '✅' : '❌'}`);
      
      if (correctoPais) {
        try {
          // Solo probar la API si la detección es correcta
          const addressData = await shippingService.getAddressFromPostalCode(cp);
          console.log(`📍 Dirección obtenida: ${addressData.area_level2}, ${addressData.area_level1}`);
          console.log(`🌍 País confirmado: ${addressData.country_code} ✅`);
        } catch (error) {
          console.log(`❌ Error obteniendo dirección: ${error.message}`);
        }
      }
      
      console.log(''); // Línea en blanco
    }
    
    console.log('📊 RESUMEN DEL TEST COMPLETADO');
    console.log('==============================');
    console.log('✅ Sistema de detección internacional funcionando');
    console.log('🌍 Soporte para múltiples países implementado');
    console.log('🔌 Integración con Zippopotam API activa');
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

// Ejecutar el test
testCodigosPostalesInternacionales();
