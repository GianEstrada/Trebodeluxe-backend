#!/usr/bin/env node

/**
 * Test del servicio real de shipping-quote
 * Para probar San Nicolás → Escobedo con el servicio actualizado
 */

// Simular variables de entorno para el test
process.env.SKYDROP_API_KEY = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
process.env.SKYDROP_API_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testRealService() {
  console.log('🧪 TEST DEL SERVICIO REAL DE SHIPPING QUOTE');
  console.log('============================================\n');

  try {
    const shippingService = new ShippingQuoteService();
    
    console.log('📦 Probando cotización San Nicolás → Escobedo...');
    console.log('   Origen: CP 64000 (configurado en el servicio)');
    console.log('   Destino: CP 66050 (General Escobedo)\n');

    // Simular un carrito con algunos productos
    const mockCartId = 'test_cart_123';
    
    // Necesitamos simular los datos del carrito también
    // Para este test, vamos a usar directamente el método de cotización
    
    console.log('🔑 Iniciando proceso de cotización...');
    
    // Como el servicio necesita datos de carrito de la BD, 
    // vamos a probar solo el método de autenticación primero
    const token = await shippingService.skyDropXAuth.getBearerToken();
    console.log('✅ Autenticación exitosa');
    console.log('   Token obtenido:', token ? 'SÍ' : 'NO');
    
    // Para una prueba completa necesitaríamos:
    // const result = await shippingService.getShippingQuote(mockCartId, '66050');
    
    console.log('\n📋 Estado del servicio:');
    console.log('   Base URL:', shippingService.baseUrl);
    console.log('   Dirección origen configurada:', JSON.stringify(shippingService.addressFrom, null, 2));
    console.log('   Carriers configurados:', shippingService.requestedCarriers);
    
    console.log('\n✅ Servicio configurado correctamente');
    console.log('💡 Nota: Para prueba completa necesitas una BD con datos de carrito');

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testRealService();
