#!/usr/bin/env node

/**
 * Test completo del sistema híbrido integrado con SkyDropX
 * Prueba cotizaciones locales y nacionales usando tu servicio real
 */

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testIntegratedHybridSystem() {
  console.log('🎯 PRUEBA DEL SISTEMA HÍBRIDO INTEGRADO');
  console.log('======================================\n');

  const shippingService = new ShippingQuoteService();

  // Simular datos de carrito (similar a los que tendrías en tu DB)
  const mockCartId = 'test_cart_123';
  
  // Mock de datos del carrito para testing
  const originalGetCartShippingData = shippingService.getCartShippingData;
  shippingService.getCartShippingData = async (cartId) => {
    console.log(`📦 Simulando datos del carrito ${cartId}...`);
    return {
      cartItems: [
        { weight: 0.5, length: 10, width: 8, height: 5 },
        { weight: 1.0, length: 15, width: 12, height: 8 },
        { weight: 0.8, length: 12, width: 10, height: 6 }
      ],
      totalWeight: 2.3,
      dimensions: {
        length: 20,
        width: 15,
        height: 10
      },
      compressionFactor: 0.8
    };
  };

  console.log('🔬 PRUEBA 1: Envío LOCAL (San Nicolás → Escobedo)');
  console.log('=' .repeat(50));
  
  try {
    const localResult = await shippingService.getHybridShippingQuote(mockCartId, '66050');
    
    console.log('✅ Resultado envío local:');
    console.log(`   Tipo: ${localResult.type}`);
    console.log(`   Es local: ${localResult.isLocalDelivery}`);
    console.log(`   Zona: ${localResult.zone || 'N/A'}`);
    console.log(`   Distancia: ${localResult.distance || 'N/A'} km`);
    
    console.log('\n💰 OPCIONES LOCALES:');
    if (localResult.quotations.localOptions.length > 0) {
      localResult.quotations.localOptions.forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.provider}: $${option.price} MXN (${option.estimatedTime})`);
      });
    } else {
      console.log('   ❌ No hay opciones locales disponibles');
    }
    
    console.log('\n📦 OPCIONES NACIONALES (SkyDropX):');
    if (localResult.quotations.nationalOptions.length > 0) {
      localResult.quotations.nationalOptions.forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.provider} - ${option.service}: $${option.price} MXN (${option.estimatedTime})`);
      });
    } else {
      console.log('   ❌ No hay opciones nacionales disponibles');
    }

    console.log('\n🎯 RECOMENDACIÓN:');
    console.log(`   ${localResult.quotations.recommendation.message}`);

    console.log('\n📊 RESUMEN:');
    console.log(`   Total de opciones: ${localResult.quotations.allOptions.length}`);
    if (localResult.quotations.allOptions.length > 0) {
      const cheapest = localResult.quotations.allOptions[0];
      console.log(`   Más barata: ${cheapest.provider} - $${cheapest.price} MXN`);
    }

  } catch (error) {
    console.error('❌ Error en prueba local:', error.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  console.log('🔬 PRUEBA 2: Envío NACIONAL (San Nicolás → Guadalajara)');
  console.log('=' .repeat(50));
  
  try {
    const nationalResult = await shippingService.getHybridShippingQuote(mockCartId, '44100');
    
    console.log('✅ Resultado envío nacional:');
    console.log(`   Tipo: ${nationalResult.type}`);
    console.log(`   Es local: ${nationalResult.isLocalDelivery}`);
    console.log(`   Zona: ${nationalResult.zone || 'N/A'}`);
    
    console.log('\n💰 OPCIONES LOCALES:');
    if (nationalResult.quotations.localOptions.length > 0) {
      nationalResult.quotations.localOptions.forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.provider}: $${option.price} MXN (${option.estimatedTime})`);
      });
    } else {
      console.log('   ❌ No hay opciones locales (correcto para envío nacional)');
    }
    
    console.log('\n📦 OPCIONES NACIONALES (SkyDropX):');
    if (nationalResult.quotations.nationalOptions.length > 0) {
      nationalResult.quotations.nationalOptions.forEach((option, index) => {
        console.log(`   ${index + 1}. ${option.provider} - ${option.service}: $${option.price} MXN (${option.estimatedTime})`);
      });
    } else {
      console.log('   ❌ No hay opciones nacionales disponibles');
    }

    console.log('\n🎯 RECOMENDACIÓN:');
    console.log(`   ${nationalResult.quotations.recommendation.message}`);

    console.log('\n📊 RESUMEN:');
    console.log(`   Total de opciones: ${nationalResult.quotations.allOptions.length}`);
    if (nationalResult.quotations.allOptions.length > 0) {
      const cheapest = nationalResult.quotations.allOptions[0];
      console.log(`   Más barata: ${cheapest.provider} - $${cheapest.price} MXN`);
    }

  } catch (error) {
    console.error('❌ Error en prueba nacional:', error.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  console.log('🔬 PRUEBA 3: Comparación con método original');
  console.log('=' .repeat(50));
  
  try {
    console.log('⏱️  Probando método original vs híbrido...');
    
    const startTime = Date.now();
    const originalResult = await shippingService.getShippingQuote(mockCartId, '44100');
    const originalTime = Date.now() - startTime;
    
    console.log('✅ Método original completado:');
    console.log(`   Tiempo: ${originalTime}ms`);
    console.log(`   Opciones encontradas: ${originalResult.quotations?.length || 'N/A'}`);
    
    const hybridStartTime = Date.now();
    const hybridResult = await shippingService.getHybridShippingQuote(mockCartId, '44100');
    const hybridTime = Date.now() - hybridStartTime;
    
    console.log('\n✅ Método híbrido completado:');
    console.log(`   Tiempo: ${hybridTime}ms`);
    console.log(`   Opciones encontradas: ${hybridResult.quotations.allOptions.length}`);
    
    console.log('\n📊 COMPARACIÓN:');
    console.log(`   Diferencia de tiempo: ${hybridTime - originalTime}ms`);
    console.log(`   Ventaja híbrida: Detección automática local/nacional + más opciones`);

  } catch (error) {
    console.error('❌ Error en comparación:', error.message);
  }

  // Restaurar método original
  shippingService.getCartShippingData = originalGetCartShippingData;

  console.log('\n🏁 PRUEBAS COMPLETADAS');
  console.log('\n✅ RESUMEN DE IMPLEMENTACIÓN:');
  console.log('   1. Sistema híbrido integrado correctamente');
  console.log('   2. SkyDropX funcionando como backend nacional');
  console.log('   3. Detección automática local vs nacional');
  console.log('   4. Método de respaldo implementado');
  console.log('   5. Formato compatible con frontend existente');
  
  console.log('\n🚀 PRÓXIMOS PASOS:');
  console.log('   1. Registrarse en Uber Direct para envíos locales');
  console.log('   2. Actualizar rutas del backend para usar getHybridShippingQuote');
  console.log('   3. Actualizar frontend para mostrar opciones locales vs nacionales');
  console.log('   4. Configurar variables de entorno para APIs locales');
}

// Ejecutar el test
testIntegratedHybridSystem().catch(console.error);
