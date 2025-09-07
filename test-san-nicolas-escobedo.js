#!/usr/bin/env node

/**
 * Test de cotización real: San Nicolás → Escobedo
 * Ambas ciudades en Nuevo León, México
 */

const axios = require('axios');

async function testSanNicolasToEscobedo() {
  console.log('🚛 COTIZACIÓN: SAN NICOLÁS → ESCOBEDO');
  console.log('=========================================\n');

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

    // Paso 2: Crear cotización San Nicolás → Escobedo
    console.log('📦 Paso 2: Creando cotización San Nicolás → Escobedo...');
    
    const quotationPayload = {
      quotation: {
        order_id: `san_nicolas_escobedo_${Date.now()}`,
        address_from: {
          name: "Trebode Luxe San Nicolas",
          company: "Trebode Luxe",
          street1: "Av Universidad 123", // Dirección central de San Nicolás
          area_level3: "Centro", // Colonia
          area_level2: "San Nicolas de los Garza", // Municipio
          area_level1: "Nuevo Leon", // Estado
          postal_code: "66450", // CP Centro de San Nicolás
          country_code: "MX",
          phone: "8181234567"
        },
        address_to: {
          name: "Cliente Escobedo",
          street1: "Av Raul Salinas Lozano 100", // Dirección central de Escobedo
          area_level3: "Centro", // Colonia
          area_level2: "General Escobedo", // Municipio
          area_level1: "Nuevo Leon", // Estado
          postal_code: "66050", // CP Centro de Escobedo
          country_code: "MX",
          phone: "8187654321"
        },
        parcels: [
          {
            length: 20, // 20 cm
            width: 15,  // 15 cm  
            height: 10, // 10 cm
            weight: 1,  // 1 kg - peso más ligero para envío local
            declared_value: 500 // Valor de $500 MXN
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
    console.log('📍 Destino: General Escobedo, N.L. (CP: 66050)');
    console.log('📦 Paquete: 20x15x10 cm, 1kg, $500 MXN\n');

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
      console.log('\n🔍 ERRORES ENCONTRADOS:');
      data.rates.forEach(rate => {
        if (!rate.success && rate.error_messages) {
          console.log(`   ${rate.provider_display_name}: ${JSON.stringify(rate.error_messages)}`);
        }
      });
    } else {
      successfulRates
        .sort((a, b) => parseFloat(a.total) - parseFloat(b.total)) // Ordenar por precio
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
testSanNicolasToEscobedo();
