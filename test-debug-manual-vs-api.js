#!/usr/bin/env node

/**
 * Test de debugging para comparar con consulta manual de SkyDropX
 * Probando diferentes configuraciones para San Nicolás → Escobedo
 */

const axios = require('axios');

async function debugManualVsAPI() {
  console.log('🔍 DEBUG: COMPARACIÓN MANUAL vs API');
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

    // Configuraciones diferentes para probar
    const testConfigs = [
      {
        name: "Configuración 1: Mínima",
        payload: {
          quotation: {
            order_id: `test_minimal_${Date.now()}`,
            address_from: {
              postal_code: "66450",
              country_code: "MX"
            },
            address_to: {
              postal_code: "66050", 
              country_code: "MX"
            },
            parcels: [{
              length: 20,
              width: 15, 
              height: 10,
              weight: 1,
              declared_value: 500
            }],
            shipment_type: "package"
          }
        }
      },
      {
        name: "Configuración 2: Solo carriers específicos",
        payload: {
          quotation: {
            order_id: `test_specific_${Date.now()}`,
            address_from: {
              postal_code: "66450",
              country_code: "MX"
            },
            address_to: {
              postal_code: "66050",
              country_code: "MX"
            },
            parcels: [{
              length: 20,
              width: 15,
              height: 10,
              weight: 1,
              declared_value: 500
            }],
            requested_carriers: ["paquetexpress"],
            shipment_type: "package"
          }
        }
      },
      {
        name: "Configuración 3: Sin requested_carriers",
        payload: {
          quotation: {
            order_id: `test_no_carriers_${Date.now()}`,
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
              weight: 1,
              declared_value: 500
            }],
            shipment_type: "package"
          }
        }
      },
      {
        name: "Configuración 4: Peso más alto",
        payload: {
          quotation: {
            order_id: `test_heavy_${Date.now()}`,
            address_from: {
              postal_code: "66450",
              country_code: "MX"
            },
            address_to: {
              postal_code: "66050",
              country_code: "MX"
            },
            parcels: [{
              length: 30,
              width: 25,
              height: 20,
              weight: 5,
              declared_value: 2000
            }],
            shipment_type: "package"
          }
        }
      }
    ];

    for (let i = 0; i < testConfigs.length; i++) {
      const config = testConfigs[i];
      console.log(`\n📦 ${config.name}`);
      console.log('='.repeat(config.name.length + 4));
      
      try {
        const response = await axios.post(
          `${API_URL}/quotations`,
          config.payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        const successfulRates = response.data.rates.filter(rate => rate.success === true);
        const failedRates = response.data.rates.filter(rate => rate.success === false);

        console.log(`✅ Respuesta exitosa (Status: ${response.status})`);
        console.log(`   Cotizaciones exitosas: ${successfulRates.length}`);
        console.log(`   Cotizaciones fallidas: ${failedRates.length}`);

        if (successfulRates.length > 0) {
          console.log('\n💰 COTIZACIONES ENCONTRADAS:');
          successfulRates.forEach(rate => {
            console.log(`   ${rate.provider_display_name} - ${rate.provider_service_name}: $${rate.total} MXN (${rate.days} días)`);
          });
        }

        if (failedRates.length > 0) {
          console.log('\n⚠️ ERRORES:');
          failedRates.slice(0, 3).forEach(rate => { // Solo mostrar primeros 3 errores
            console.log(`   ${rate.provider_display_name}: ${rate.error_messages?.[0]?.error_message || 'Sin mensaje'}`);
          });
        }

      } catch (error) {
        console.log(`❌ Error: ${error.response?.status} - ${error.response?.statusText}`);
        if (error.response?.data?.errors) {
          console.log(`   Detalle: ${JSON.stringify(error.response.data.errors)}`);
        }
      }
    }

    console.log('\n🔍 PREGUNTAS PARA COMPARAR CON TU CONSULTA MANUAL:');
    console.log('================================================');
    console.log('1. ¿Qué códigos postales usas en la página de SkyDropX?');
    console.log('2. ¿Qué peso y dimensiones pones?');
    console.log('3. ¿Qué paqueterías te aparecen disponibles?');
    console.log('4. ¿Usas algún campo especial como "tipo de servicio"?');
    console.log('5. ¿Hay alguna configuración adicional en la página?');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

debugManualVsAPI();
