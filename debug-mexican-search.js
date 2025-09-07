/**
 * Debug del problema con la búsqueda en base mexicana
 */

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function debugMexicanSearch() {
  console.log('🔍 DEBUG: Búsqueda en base mexicana');
  console.log('===================================');
  
  const service = new ShippingQuoteService();
  
  try {
    console.log('\n1️⃣ Estado inicial:');
    console.log('   Cache size:', service.postalCodeCache.size);
    console.log('   Data loaded:', service.postalCodeDataLoaded);
    
    console.log('\n2️⃣ Probando searchInMexicanDatabase para 01000...');
    const result1 = await service.searchInMexicanDatabase('01000');
    console.log('   Resultado:', result1);
    
    console.log('\n3️⃣ Estado después de primera búsqueda:');
    console.log('   Cache size:', service.postalCodeCache.size);
    console.log('   Data loaded:', service.postalCodeDataLoaded);
    
    console.log('\n4️⃣ Verificando manualmente el cache:');
    console.log('   ¿Tiene 01000?:', service.postalCodeCache.has('01000'));
    console.log('   ¿Tiene 64000?:', service.postalCodeCache.has('64000'));
    console.log('   ¿Tiene 61422?:', service.postalCodeCache.has('61422'));
    
    if (service.postalCodeCache.has('01000')) {
      console.log('   Datos de 01000:', service.postalCodeCache.get('01000'));
    }
    
    console.log('\n5️⃣ Probando búsqueda directa con getAddressFromPostalCode:');
    try {
      const directResult = await service.getAddressFromPostalCode('01000');
      console.log('   Resultado directo:', directResult);
    } catch (error) {
      console.log('   Error directo:', error.message);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  }
}

debugMexicanSearch();
