/**
 * Prueba directa del cache de códigos postales mexicanos
 */

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testMexicanPostalCodes() {
  console.log('🔍 PRUEBA DIRECTA DE CÓDIGOS POSTALES MEXICANOS');
  console.log('==============================================');
  
  const service = new ShippingQuoteService();
  
  try {
    // Verificar estado inicial
    console.log('\n📋 Estado inicial:');
    console.log('   Cache inicializado:', service.postalCodeCache ? 'SÍ' : 'NO');
    console.log('   Datos cargados:', service.postalCodeDataLoaded);
    console.log('   Tamaño cache:', service.postalCodeCache ? service.postalCodeCache.size : 0);
    
    // Cargar datos
    console.log('\n📂 Cargando datos de códigos postales...');
    await service.loadPostalCodeData();
    
    // Verificar después de cargar
    console.log('\n📊 Estado después de cargar:');
    console.log('   Datos cargados:', service.postalCodeDataLoaded);
    console.log('   Tamaño cache:', service.postalCodeCache.size);
    
    // Probar CPs específicos
    const testCPs = ['01000', '61422', '64000', '06000'];
    
    console.log('\n🧪 Probando CPs específicos:');
    for (const cp of testCPs) {
      const found = service.postalCodeCache.has(cp);
      console.log(`   CP ${cp}: ${found ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
      
      if (found) {
        const data = service.postalCodeCache.get(cp);
        console.log(`      Estado: ${data.area_level1}`);
        console.log(`      Municipio: ${data.area_level2}`);
        console.log(`      Colonia: ${data.area_level3}`);
      }
    }
    
    // Probar función searchInMexicanDatabase
    console.log('\n🔍 Probando función searchInMexicanDatabase:');
    const searchResult = await service.searchInMexicanDatabase('01000');
    console.log('   Resultado:', JSON.stringify(searchResult, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testMexicanPostalCodes();
