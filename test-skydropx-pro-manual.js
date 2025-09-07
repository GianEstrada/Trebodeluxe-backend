#!/usr/bin/env node

/**
 * Test de autenticación SkyDropX PRO con credenciales manuales
 * Para usar cuando las variables de entorno están en Render
 */

const axios = require('axios');

async function testSkyDropXProAuth() {
  console.log('🧪 TEST DE AUTENTICACIÓN SKYDROPX PRO');
  console.log('====================================\n');

  // CREDENCIALES DE RENDER
  const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
  const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';
  
  // URLs a probar
  const AUTH_URLS = [
    'https://pro.skydropx.com/api/v1/oauth/token',
    'https://pro.skydropx.com/oauth/token',
    'https://pro.skydropx.com/api/v1/auth/token',
    'https://api.skydropx.com/oauth/token'
  ];
  const API_URL = 'https://pro.skydropx.com/api/v1';

  console.log('📋 Configuración:');
  console.log(`   Auth URL: ${AUTH_URL}`);
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Client ID: ${CLIENT_ID}`);
  console.log(`   Client Secret: ${CLIENT_SECRET ? '✅ Configurado' : '❌ No configurado'}\n`);

  if (CLIENT_ID === 'TU_CLIENT_ID_AQUI' || CLIENT_SECRET === 'TU_CLIENT_SECRET_AQUI') {
    console.log('❌ INSTRUCCIONES:');
    console.log('1. Ve a Render.com → tu servicio → Environment');
    console.log('2. Copia los valores de SKYDROP_CLIENT_ID y SKYDROP_CLIENT_SECRET');
    console.log('3. Reemplaza las variables en este archivo');
    console.log('4. Ejecuta el test nuevamente\n');
    return;
  }

  try {
    // Paso 1: Obtener Bearer Token
    console.log('🔑 Paso 1: Obteniendo Bearer token...');
    
    const authPayload = {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    };

    console.log('📤 Payload de autenticación:');
    console.log(JSON.stringify(authPayload, null, 2));

    const authResponse = await axios.post(AUTH_URL, authPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ TOKEN OBTENIDO EXITOSAMENTE!');
    console.log(`   Status: ${authResponse.status}`);
    console.log(`   Token type: ${authResponse.data.token_type}`);
    console.log(`   Access token: ${authResponse.data.access_token.substring(0, 20)}...`);
    console.log(`   Expires in: ${authResponse.data.expires_in} segundos\n`);

    const bearerToken = authResponse.data.access_token;

    // Paso 2: Probar API con el token
    console.log('💰 Paso 2: Probando cotización con Bearer token...');
    
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

    const quotationResponse = await axios.post(`${API_URL}/quotations`, quotationData, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    console.log('\n✅ COTIZACIÓN EXITOSA!');
    console.log(`   Status: ${quotationResponse.status}`);
    console.log('\n📊 RESPUESTA COMPLETA:');
    console.log(JSON.stringify(quotationResponse.data, null, 2));

  } catch (error) {
    console.log('\n❌ ERROR:');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error data:`, JSON.stringify(error.response.data, null, 2));
      console.log(`   Headers:`, JSON.stringify(error.response.headers, null, 2));
    } else {
      console.log(`   Error message: ${error.message}`);
    }

    if (error.config) {
      console.log(`   URL: ${error.config.url}`);
      console.log(`   Method: ${error.config.method}`);
    }
  }

  console.log('\n🏁 Test completado');
}

// Ejecutar test
testSkyDropXProAuth().catch(console.error);
