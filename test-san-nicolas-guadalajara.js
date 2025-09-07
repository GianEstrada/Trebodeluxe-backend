#!/usr/bin/env node

/**
 * Test de cotización: San Nicolás → Guadalajara
 * Para probar envíos de media distancia
 */

const axios = require('axios');

async function testSanNicolasToGuadalajara() {
  console.log('🚛 COTIZACIÓN: SAN NICOLÁS → GUADALAJARA');
  console.log('==========================================\n');

  // Credenciales
  const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
  const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
  const AUTH_URL = 'https://pro.skydropx.com/api/v1/oauth/token';
  const API_URL = 'https://pro.skydropx.com/api/v1';

  try {
    // Paso 1: Obtener Bearer token
    console.log('🔑 Paso 1: Obteniendo Bearer token...');
    
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
    console.log('✅ Token obtenido - Expira en:', authResponse.data.expires_in, 'segundos\n');

    // Paso 2: Crear cotización San Nicolás → Guadalajara
    console.log('📦 Paso 2: Creando cotización San Nicolás → Guadalajara...');
    
    const quotationPayload = {
      quotation: {
        order_id: `san_nicolas_guadalajara_${Date.now()}`,
        address_from: {
          name: "Trebode Luxe San Nicolas",
          company: "Trebode Luxe",
          street1: "Av Universidad 123",
          area_level3: "Centro",
          area_level2: "San Nicolas de los Garza",
          area_level1: "Nuevo Leon",
          postal_code: "66450",
          country_code: "MX",
          phone: "8181234567"
        },
        address_to: {
          name: "Cliente Guadalajara",
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
            weight: 2, // 2 kg
            declared_value: 800
          }
        ],
        requested_carriers: [
          "fedex",
          "dhl", 
          "paquetexpress"
        ],
        shipment_type: "package",
        quote_type: "carrier"
      }
    };

    console.log('📍 Origen: San Nicolás de los Garza, N.L. (CP: 66450)');
    console.log('📍 Destino: Guadalajara, Jalisco (CP: 44100)');
    console.log('📦 Paquete: 20x15x10 cm, 2kg, $800 MXN');
    console.log('🛣️  Distancia: ~540 km\n');

    console.log('📤 Enviando cotización...');

    const quotationResponse = await axios.post(
      `${API_URL}/quotations`,
      quotationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ ¡COTIZACIÓN EXITOSA!');
    console.log('   Status:', quotationResponse.status);
    
    const data = quotationResponse.data;
    
    // Mostrar solo las cotizaciones exitosas
    console.log('\n💰 COTIZACIONES DISPONIBLES:');
    console.log('============================');
    
    const successfulRates = data.rates.filter(rate => rate.success === true);
    
    if (successfulRates.length === 0) {
      console.log('❌ No se encontraron cotizaciones disponibles');
    } else {
      successfulRates
        .sort((a, b) => parseFloat(a.total) - parseFloat(b.total))
        .forEach((rate, index) => {
          console.log(`${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}`);
          console.log(`   💲 Precio: $${rate.total} ${rate.currency_code}`);
          console.log(`   ⏱️  Tiempo: ${rate.days} día(s)`);
          console.log(`   📊 Zona: ${rate.zone || 'N/A'}`);
          console.log('');
        });
    }

    // Mostrar errores si los hay
    const failedRates = data.rates.filter(rate => rate.success === false);
    if (failedRates.length > 0) {
      console.log('\n⚠️  SERVICIOS NO DISPONIBLES:');
      console.log('==============================');
      failedRates.forEach(rate => {
        console.log(`❌ ${rate.provider_display_name} - ${rate.provider_service_name}`);
        if (rate.error_messages && Array.isArray(rate.error_messages)) {
          rate.error_messages.forEach(error => {
            console.log(`   Razón: ${error.error_message}`);
          });
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error en el test:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('\n🔍 Respuesta completa del error:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Ejecutar el test
testSanNicolasToGuadalajara();
