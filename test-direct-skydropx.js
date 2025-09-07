#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

/**
 * Prueba directa de SkyDropX sin base de datos
 */

async function testDirectSkyDropX() {
  console.log('🧪 PRUEBA DIRECTA DE SKYDROPX SIN BASE DE DATOS');
  console.log('===============================================\n');

  const apiKey = process.env.SKYDROP_API_KEY;
  const baseUrl = 'https://api.skydropx.com/v1'; // Usar API legacy forzadamente

  console.log('📋 Configuración:');
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   API Key: ${apiKey ? '✅ Configurada' : '❌ No configurada'}`);
  
  if (!apiKey) {
    console.log('\n❌ ERROR: SKYDROP_API_KEY no está configurada');
    return;
  }

  // Headers de autenticación
  const headers = {
    'Authorization': `Token token=${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  console.log('\n🔑 Headers de autenticación:');
  console.log(JSON.stringify(headers, null, 2));

  try {
    // Probar cotización directa
    console.log('\n💰 Probando cotización directa...');
    
    const quotationData = {
      zip_from: "64000",  // Monterrey
      zip_to: "66058",    // San Pedro
      parcel: {
        weight: 1,
        height: 10,
        width: 10,
        length: 10
      }
    };

    console.log('📤 Payload de cotización:');
    console.log(JSON.stringify(quotationData, null, 2));

    const response = await axios.post(`${baseUrl}/quotations`, quotationData, {
      headers: headers,
      timeout: 30000
    });

    console.log('\n✅ COTIZACIÓN EXITOSA!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers respuesta:`, JSON.stringify(response.headers, null, 2));
    console.log('\n📊 DATOS COMPLETOS DE RESPUESTA:');
    console.log(JSON.stringify(response.data, null, 2));

    // Analizar la estructura de la respuesta
    if (Array.isArray(response.data)) {
      console.log(`\n📈 ANÁLISIS: Recibido array con ${response.data.length} cotizaciones`);
      response.data.forEach((quote, index) => {
        console.log(`\n💵 Cotización ${index + 1}:`);
        console.log(`   Paquetería: ${quote.provider || 'N/A'}`);
        console.log(`   Precio: $${quote.amount_local || 'N/A'} ${quote.currency_local || 'MXN'}`);
        console.log(`   Servicio: ${quote.service_level_name || 'N/A'}`);
        console.log(`   Días: ${quote.days || 'N/A'}`);
        console.log(`   Total: $${quote.total_pricing || quote.amount_local || 'N/A'}`);
      });
    } else if (response.data.data) {
      console.log('\n📈 ANÁLISIS: Respuesta con estructura de datos anidada');
      console.log(JSON.stringify(response.data.data, null, 2));
    }

  } catch (error) {
    console.log('\n❌ ERROR EN COTIZACIÓN:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error:`, JSON.stringify(error.response?.data || error.message, null, 2));
    
    if (error.response?.headers) {
      console.log(`   Headers respuesta:`, JSON.stringify(error.response.headers, null, 2));
    }

    if (error.config) {
      console.log(`   URL solicitada: ${error.config.url}`);
      console.log(`   Method: ${error.config.method}`);
    }
  }

  console.log('\n🏁 Prueba directa completada');
}

// Ejecutar prueba
testDirectSkyDropX().catch(console.error);
