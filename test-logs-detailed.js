const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testLogsWithCarrito6() {
  const shippingService = new ShippingQuoteService();
  
  console.log('🧪 =======================================');
  console.log('🧪 TESTING LOGS DETALLADOS - CARRITO 6');
  console.log('🧪 =======================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  try {
    // Test 1: Cotización Nacional (México)
    console.log('🇲🇽 ===== TEST 1: COTIZACIÓN NACIONAL =====');
    const resultNacional = await shippingService.getShippingQuoteHybrid('6', '64000', 'MX');
    
    console.log('✅ RESULTADO NACIONAL:', {
      success: resultNacional.success,
      quotations: resultNacional.quotations ? 'Presente' : 'No presente',
      error: resultNacional.error || 'Ninguno'
    });
    
    console.log('');
    console.log('🌍 ===== TEST 2: COTIZACIÓN INTERNACIONAL =====');
    
    // Test 2: Cotización Internacional (USA)
    const resultInternacional = await shippingService.getShippingQuoteHybrid('6', '61422', 'US');
    
    console.log('✅ RESULTADO INTERNACIONAL:', {
      success: resultInternacional.success,
      quotations: resultInternacional.quotations ? 'Presente' : 'No presente',
      error: resultInternacional.error || 'Ninguno'
    });

  } catch (error) {
    console.error('❌ ERROR EN TEST:', error.message);
    console.error('🔍 Stack:', error.stack);
  }

  console.log('');
  console.log('🧪 =======================================');
  console.log('🧪 TEST DE LOGS COMPLETADO');
  console.log('🧪 =======================================');
}

// Ejecutar test
testLogsWithCarrito6();
