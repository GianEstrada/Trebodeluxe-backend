const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testCartDataLogs() {
  const shippingService = new ShippingQuoteService();
  
  console.log('🧪 =======================================');
  console.log('🧪 TESTING LOGS DE DATOS DEL CARRITO');
  console.log('🧪 =======================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  try {
    // Solo obtener datos del carrito (sin hacer petición a SkyDropX)
    console.log('🛒 ===== OBTENIENDO DATOS DEL CARRITO 6 =====');
    const cartData = await shippingService.getCartShippingData('6');
    
    console.log('');
    console.log('✅ DATOS DEL CARRITO OBTENIDOS EXITOSAMENTE');
    console.log('📊 Resumen final:');
    console.log('   - Items:', cartData.cartItems.length);
    console.log('   - Peso total:', cartData.totalWeight, 'kg');
    console.log('   - Valor total: $', cartData.totalValue || 'NO CALCULADO');
    console.log('   - Dimensiones:', JSON.stringify(cartData.dimensions, null, 2));
    console.log('   - Factor compresión:', cartData.compressionFactor);
    
    console.log('');
    console.log('📋 ESTRUCTURA COMPLETA DEL CART DATA:');
    console.log('=====================================');
    console.log(JSON.stringify(cartData, null, 2));

  } catch (error) {
    console.error('❌ ERROR EN TEST:', error.message);
    console.error('🔍 Stack:', error.stack);
  }

  console.log('');
  console.log('🧪 =======================================');
  console.log('🧪 TEST DE DATOS DEL CARRITO COMPLETADO');
  console.log('🧪 =======================================');
}

// Ejecutar test
testCartDataLogs();
