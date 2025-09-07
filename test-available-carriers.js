#!/usr/bin/env node

/**
 * Test para obtener la lista de carriers disponibles en SkyDropX PRO
 */

const axios = require('axios');

async function getAvailableCarriers() {
  console.log('📋 CONSULTANDO CARRIERS DISPONIBLES EN SKYDROPX PRO');
  console.log('===================================================\n');

  // Credenciales
  const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
  const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
  const AUTH_URL = 'https://pro.skydropx.com/api/v1/oauth/token';
  const API_URL = 'https://pro.skydropx.com/api/v1';

  try {
    // Paso 1: Obtener Bearer token
    console.log('🔑 Obteniendo Bearer token...');
    
    const authResponse = await axios.post(AUTH_URL, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      refresh_token: '',
      scope: 'default orders.create'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const token = authResponse.data.access_token;
    console.log('✅ Token obtenido\n');

    // Paso 2: Consultar carriers disponibles
    console.log('📤 Consultando carriers disponibles...');

    try {
      const carriersResponse = await axios.get(
        `${API_URL}/carriers`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Carriers obtenidos:');
      console.log('Status:', carriersResponse.status);
      console.log('\n📋 LISTA DE CARRIERS DISPONIBLES:');
      console.log('=================================');
      
      if (carriersResponse.data && Array.isArray(carriersResponse.data)) {
        carriersResponse.data.forEach((carrier, index) => {
          console.log(`${index + 1}. ${carrier.name || carrier.code || carrier.display_name || JSON.stringify(carrier)}`);
        });
      } else {
        console.log('Respuesta completa:');
        console.log(JSON.stringify(carriersResponse.data, null, 2));
      }

    } catch (carriersError) {
      console.log('❌ Error al obtener carriers:', carriersError.response?.status);
      console.log('Probando endpoint alternativo...\n');
      
      // Probar con cotización usando "all" para ver qué carriers responden
      console.log('📤 Probando cotización con "all" carriers...');
      
      const quotationPayload = {
        quotation: {
          order_id: `test_all_carriers_${Date.now()}`,
          address_from: {
            name: "Test Origin",
            street1: "Av Universidad 123",
            area_level3: "Centro",
            area_level2: "San Nicolas de los Garza",
            area_level1: "Nuevo Leon",
            postal_code: "66450",
            country_code: "MX",
            phone: "8181234567"
          },
          address_to: {
            name: "Test Destination",
            street1: "Av Vallarta 1000",
            area_level3: "Centro",
            area_level2: "Guadalajara",
            area_level1: "Jalisco",
            postal_code: "44100",
            country_code: "MX",
            phone: "3387654321"
          },
          parcels: [
            {
              length: 20,
              width: 15,
              height: 10,
              weight: 2,
              declared_value: 500
            }
          ],
          requested_carriers: [], // Vacío para obtener todos
          shipment_type: "package",
          quote_type: "carrier"
        }
      };

      const allCarriersResponse = await axios.post(
        `${API_URL}/quotations`,
        quotationPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('✅ Respuesta con todos los carriers:');
      
      const data = allCarriersResponse.data;
      
      if (data.quotation_scope && data.quotation_scope.found_carriers) {
        console.log('\n📋 CARRIERS ENCONTRADOS:');
        console.log('========================');
        data.quotation_scope.found_carriers.forEach((carrier, index) => {
          console.log(`${index + 1}. ${carrier}`);
        });
      }

      if (data.rates && Array.isArray(data.rates)) {
        console.log('\n📋 CARRIERS QUE RESPONDIERON:');
        console.log('============================');
        const uniqueCarriers = [...new Set(data.rates.map(rate => rate.provider_name))];
        uniqueCarriers.forEach((carrier, index) => {
          console.log(`${index + 1}. ${carrier}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('\n🔍 Respuesta completa del error:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Ejecutar el test
getAvailableCarriers();
