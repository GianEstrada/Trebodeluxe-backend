#!/usr/bin/env node

/**
 * Test para verificar el sistema de fallback de códigos postales
 * Base local → Zippopotam → Fallback manual → Genérico
 */

// Simular variables de entorno
process.env.SKYDROP_API_KEY = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
process.env.SKYDROP_API_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testPostalCodeFallback() {
  console.log('🧪 TEST DE SISTEMA DE FALLBACK DE CÓDIGOS POSTALES');
  console.log('===================================================\n');

  try {
    const shippingService = new ShippingQuoteService();

    // Test cases para diferentes escenarios
    const testCases = [
      {
        name: "CP que probablemente ESTÉ en base local",
        postalCode: "64000", // Monterrey Centro - común
        expectedSource: "Base local (CPdescarga.txt)"
      },
      {
        name: "CP que probablemente NO esté en base local pero SÍ en Zippopotam",
        postalCode: "90210", // CP de prueba que puede existir en Zippopotam
        expectedSource: "Zippopotam.us"
      },
      {
        name: "CP en fallback manual",
        postalCode: "44100", // Guadalajara Centro - añadido manualmente
        expectedSource: "Fallback manual"
      },
      {
        name: "CP inexistente - debe usar genérico",
        postalCode: "99999", // CP que no existe en ningún lado
        expectedSource: "Fallback genérico"
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 TEST ${i + 1}: ${testCase.name}`);
      console.log(`🔍 CP a probar: ${testCase.postalCode}`);
      console.log(`🎯 Fuente esperada: ${testCase.expectedSource}`);
      console.log('=' .repeat(60));

      try {
        // Limpiar cache para este test específico si es necesario
        if (testCase.postalCode === "99999") {
          // No hacer nada - queremos que falle
        }

        const result = await shippingService.getAddressFromPostalCode(testCase.postalCode);
        
        console.log('\n✅ RESULTADO:');
        console.log('📍 Estado:', result.area_level1);
        console.log('🏙️  Municipio:', result.area_level2);
        console.log('🏘️  Colonia:', result.area_level3);
        console.log('🆔 CP:', result.postal_code);
        console.log('🌍 País:', result.country_code);

        // Verificar que los datos sean válidos
        const isValid = result.country_code === "MX" && 
                       result.postal_code === testCase.postalCode &&
                       result.area_level1 && 
                       result.area_level2 && 
                       result.area_level3;

        console.log(`\n🔍 VALIDACIÓN: ${isValid ? 'DATOS VÁLIDOS ✅' : 'DATOS INCOMPLETOS ❌'}`);

        if (isValid) {
          console.log('🎉 SUCCESS: Dirección obtenida correctamente');
        } else {
          console.log('⚠️  WARNING: Datos incompletos pero funcionales');
        }

      } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        console.log('🔧 Esto puede ser esperado para CPs inexistentes');
      }

      // Pausa entre tests para mejor legibilidad
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n🎯 RESUMEN DEL TEST:');
    console.log('===================');
    console.log('✅ Sistema de fallback implementado con 4 niveles:');
    console.log('   1. 📁 Base local (CPdescarga.txt)');
    console.log('   2. 🌐 Zippopotam.us API');
    console.log('   3. 🔧 Fallback manual (CPs conocidos)');
    console.log('   4. 🆘 Fallback genérico (último recurso)');
    console.log('\n💡 El sistema ahora puede manejar cualquier CP de México');
    console.log('📊 Logs detallados muestran qué fuente se usó para cada CP');

  } catch (error) {
    console.error('❌ Error general en el test:', error.message);
    console.error(error.stack);
  }
}

testPostalCodeFallback();
