#!/usr/bin/env node

/**
 * Test para verificar unidades de peso en SkyDropX
 * Probando diferentes pesos para entender la unidad esperada
 */

const axios = require('axios');

async function testWeightUnits() {
  console.log('⚖️  TEST DE UNIDADES DE PESO SKYDROPX');
  console.log('====================================\n');

  // Credenciales
  const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
  const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
  const AUTH_URL = 'https://pro.skydropx.com/api/v1/oauth/token';
  const API_URL = 'https://pro.skydropx.com/api/v1';

  try {
    // Obtener token
    console.log('🔑 Obteniendo Bearer token...');
    const authResponse = await axios.post(AUTH_URL, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      refresh_token: '',
      scope: 'default orders.create'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const token = authResponse.data.access_token;
    console.log('✅ Token obtenido\n');

    // Tests con diferentes pesos
    const weightTests = [
      { name: "500 gramos (0.5 kg)", weight: 500, description: "Si es en gramos" },
      { name: "0.5 kilogramos", weight: 0.5, description: "Si es en kg" },
      { name: "1000 gramos (1 kg)", weight: 1000, description: "Si es en gramos" },
      { name: "1 kilogramo", weight: 1, description: "Si es en kg" },
      { name: "2000 gramos (2 kg)", weight: 2000, description: "Si es en gramos" },
      { name: "2 kilogramos", weight: 2, description: "Si es en kg" }
    ];

    for (let i = 0; i < weightTests.length; i++) {
      const test = weightTests[i];
      console.log(`\n📦 Test ${i + 1}: ${test.name}`);
      console.log(`   Peso enviado: ${test.weight}`);
      console.log(`   Interpretación: ${test.description}`);
      console.log('   ' + '='.repeat(50));
      
      try {
        const quotationPayload = {
          quotation: {
            order_id: `weight_test_${Date.now()}_${i}`,
            address_from: {
              name: "Trebode Luxe",
              street1: "Av Universidad 123",
              area_level3: "Centro",
              area_level2: "San Nicolas de los Garza",
              area_level1: "Nuevo Leon",
              postal_code: "66450",
              country_code: "MX",
              phone: "8181234567"
            },
            address_to: {
              name: "Cliente",
              street1: "Av Raul Salinas 100",
              area_level3: "Centro",
              area_level2: "General Escobedo",
              area_level1: "Nuevo Leon",
              postal_code: "66050",
              country_code: "MX",
              phone: "8187654321"
            },
            parcels: [{
              length: 20,
              width: 15,
              height: 10,
              weight: test.weight, // ⚖️ AQUÍ ESTÁ EL PESO A PROBAR
              declared_value: 500
            }],
            shipment_type: "package"
          }
        };

        const response = await axios.post(
          `${API_URL}/quotations`,
          quotationPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const successfulRates = response.data.rates.filter(rate => rate.success === true);
        const failedRates = response.data.rates.filter(rate => rate.success === false);

        console.log(`   ✅ Respuesta exitosa (Status: ${response.status})`);
        console.log(`   📊 Cotizaciones exitosas: ${successfulRates.length}`);
        console.log(`   ❌ Cotizaciones fallidas: ${failedRates.length}`);

        if (successfulRates.length > 0) {
          console.log('\n   💰 COTIZACIONES ENCONTRADAS:');
          successfulRates.slice(0, 2).forEach(rate => {
            console.log(`      ${rate.provider_display_name} - ${rate.provider_service_name}: $${rate.total} MXN (${rate.days} días)`);
          });
        }

        if (failedRates.length > 0) {
          console.log('\n   ⚠️ ERRORES TÍPICOS:');
          const uniqueErrors = [...new Set(failedRates
            .filter(rate => rate.error_messages && rate.error_messages.length > 0)
            .map(rate => rate.error_messages[0].error_message))];
          
          uniqueErrors.slice(0, 2).forEach(error => {
            console.log(`      • ${error}`);
          });
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.response?.status} - ${error.response?.statusText}`);
        if (error.response?.data?.errors) {
          console.log(`   Detalle: ${JSON.stringify(error.response.data.errors)}`);
        }
      }

      // Pausa entre tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🔍 ANÁLISIS DE RESULTADOS:');
    console.log('========================');
    console.log('• Si los tests con números pequeños (0.5, 1, 2) funcionan mejor → SkyDropX espera KG');
    console.log('• Si los tests con números grandes (500, 1000, 2000) funcionan mejor → SkyDropX espera GRAMOS');
    console.log('• Compara los errores para ver patrones de peso mínimo/máximo');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testWeightUnits();
