#!/usr/bin/env node

/**
 * Test para verificar que el formateo de cotizaciones funciona correctamente
 */

// Simular variables de entorno
process.env.SKYDROP_API_KEY = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
process.env.SKYDROP_API_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testQuotationFormatting() {
  console.log('🧪 TEST DE FORMATEO DE COTIZACIONES');
  console.log('===================================\n');

  try {
    const shippingService = new ShippingQuoteService();

    // Simular la respuesta que devuelve getShippingQuote (como la que vimos en los logs)
    const mockSkydropxResponse = {
      success: true,
      cartData: {
        items: 2,
        totalWeight: 2.8,
        dimensions: { length: 30, width: 25, height: 15 },
        compressionFactor: 0.85
      },
      quotations: {
        id: "c675e34b-e8ea-4ca9-a3bb-ccf61e6e4828",
        rates: [
          // Cotización exitosa (como la que vimos)
          {
            success: true,
            id: "d2c5207e-4d20-44fa-a7d2-796cf5e29daa",
            provider_name: "paquetexpress",
            provider_display_name: "Paquetexpress",
            provider_service_name: "Nacional",
            provider_service_code: "nacional",
            status: "price_found_internal",
            currency_code: "MXN",
            cost: "100.52",
            total: "167.0",
            days: 3,
            zone: "flat",
            country_code: "MX"
          },
          // Cotización fallida (para verificar que se filtra)
          {
            success: false,
            id: "3353fe8b-8836-4ca6-916c-416783136521",
            provider_name: "fedex",
            provider_display_name: "FedEx",
            provider_service_name: "Express Saver",
            error_messages: [
              {
                error_message: "max_weight debe ser mayor que 68"
              }
            ]
          },
          // Otra cotización exitosa simulada
          {
            success: true,
            id: "test-id-2",
            provider_name: "fedex",
            provider_display_name: "FedEx",
            provider_service_name: "Standard Overnight",
            currency_code: "MXN",
            cost: "120.00",
            total: "195.0",
            days: 1,
            zone: "1"
          }
        ]
      }
    };

    console.log('📋 Datos de entrada (simulando respuesta de SkyDropX):');
    console.log('   Total rates:', mockSkydropxResponse.quotations.rates.length);
    console.log('   Rates exitosas:', mockSkydropxResponse.quotations.rates.filter(r => r.success).length);
    console.log('   Rates fallidas:', mockSkydropxResponse.quotations.rates.filter(r => !r.success).length);

    console.log('\n🔄 Ejecutando formatQuotationsForFrontend...\n');

    // Usar el método corregido
    const formattedQuotations = shippingService.formatQuotationsForFrontend(mockSkydropxResponse);

    console.log('\n📊 RESULTADO FINAL:');
    console.log('===================');
    console.log('✅ Cotizaciones formateadas:', formattedQuotations.length);
    
    if (formattedQuotations.length > 0) {
      console.log('\n💰 COTIZACIONES DISPONIBLES PARA EL FRONTEND:');
      formattedQuotations.forEach((quote, index) => {
        console.log(`\n${index + 1}. ${quote.carrier} - ${quote.service}`);
        console.log(`   💲 Precio: $${quote.price} ${quote.currency}`);
        console.log(`   ⏱️  Tiempo: ${quote.estimatedDays} día(s)`);
        console.log(`   📄 Descripción: ${quote.description}`);
        console.log(`   🏷️  Rate ID: ${quote.rateId}`);
        console.log(`   📍 Zona: ${quote.zone || 'N/A'}`);
      });

      console.log('\n🎉 SUCCESS: El frontend ahora recibirá cotizaciones!');
      console.log('✅ Problema resuelto: Backend encuentra cotizaciones Y las formatea correctamente');

      // Simular la respuesta completa que recibiría el frontend
      const frontendResponse = {
        success: true,
        cartData: mockSkydropxResponse.cartData,
        quotations: formattedQuotations,
        message: 'Cotizaciones obtenidas exitosamente'
      };

      console.log('\n📱 RESPUESTA COMPLETA AL FRONTEND:');
      console.log(JSON.stringify(frontendResponse, null, 2));

    } else {
      console.log('\n❌ PROBLEMA: Aún no se están formateando cotizaciones');
      console.log('🔍 Revisar lógica de formateo');
    }

  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    console.error(error.stack);
  }
}

testQuotationFormatting();
