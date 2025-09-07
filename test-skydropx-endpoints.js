#!/usr/bin/env node

/**
 * Test múltiples endpoints de autenticación SkyDropX
 */

const axios = require('axios');

async function testSkyDropXEndpoints() {
  console.log('🔍 PRUEBA DE ENDPOINTS SKYDROPX');
  console.log('================================\n');

  const CLIENT_ID = 'Job3cKK5gxBvxH0QBoqbQ2ssToLemvEm4jR0CmAiBm8';
  const CLIENT_SECRET = 'oJ4OvNmjT7-OdbtU36jfuVBCuYWZHApL2V_67eS32gs';

  // Diferentes endpoints a probar
  const endpoints = [
    'https://pro.skydropx.com/api/v1/oauth/token',
    'https://pro.skydropx.com/oauth/token',
    'https://pro.skydropx.com/auth/token',
    'https://api.skydropx.com/oauth/token',
    'https://api.skydropx.com/v1/oauth/token'
  ];

  for (const endpoint of endpoints) {
    console.log(`🧪 Probando: ${endpoint}`);
    
    try {
      const response = await axios.post(endpoint, {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ ÉXITO - Status: ${response.status}`);
      console.log(`   Token type: ${response.data.token_type}`);
      console.log(`   Expires in: ${response.data.expires_in} segundos`);
      console.log(`   Access token: ${response.data.access_token ? '✅ Recibido' : '❌ Faltante'}`);
      console.log('');
      
      // Si funciona, probar una llamada a la API
      if (response.data.access_token) {
        console.log('🔍 Probando token con API...');
        
        try {
          const apiTest = await axios.get('https://pro.skydropx.com/api/v1/me', {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`
            }
          });
          console.log(`✅ API funciona - Status: ${apiTest.status}`);
        } catch (apiError) {
          console.log(`⚠️  API error - Status: ${apiError.response?.status}`);
        }
      }
      
      console.log('=========================================\n');
      return; // Salir en el primer éxito

    } catch (error) {
      console.log(`❌ Error - Status: ${error.response?.status || 'No response'}`);
      console.log(`   Message: ${error.message}`);
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
      console.log('');
    }
  }

  console.log('❌ Ningún endpoint funcionó');
}

testSkyDropXEndpoints().catch(console.error);
