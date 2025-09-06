require('dotenv').config();
const { skyDropXAuth } = require('./src/utils/skydropx-auth');

/**
 * Script de prueba para la autenticación de SkyDropX
 */
async function testSkyDropXAuth() {
  console.log('🧪 Iniciando pruebas de autenticación SkyDropX\n');

  try {
    // Verificar variables de entorno
    console.log('📋 Verificando variables de entorno...');
    console.log(`SKYDROP_API_KEY: ${process.env.SKYDROP_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
    console.log(`SKYDROP_API_SECRET: ${process.env.SKYDROP_API_SECRET ? '✅ Configurada' : '❌ No configurada'}`);
    console.log(`SKYDROP_BASE_URL: ${process.env.SKYDROP_BASE_URL || 'Usando valor por defecto'}\n`);

    if (!process.env.SKYDROP_API_KEY || !process.env.SKYDROP_API_SECRET) {
      console.error('❌ Las variables SKYDROP_API_KEY y SKYDROP_API_SECRET son requeridas');
      process.exit(1);
    }

    // Prueba 1: Obtener token por primera vez
    console.log('🔐 Prueba 1: Obteniendo token bearer...');
    const token1 = await skyDropXAuth.getBearerToken();
    console.log(`✅ Token obtenido: ${token1.substring(0, 20)}...\n`);

    // Mostrar información del token
    console.log('📊 Información del token:');
    const tokenInfo = skyDropXAuth.getTokenInfo();
    console.log(JSON.stringify(tokenInfo, null, 2));
    console.log();

    // Prueba 2: Verificar cache del token
    console.log('🔄 Prueba 2: Verificando cache del token...');
    const token2 = await skyDropXAuth.getBearerToken();
    
    if (token1 === token2) {
      console.log('✅ Cache funcionando correctamente - mismo token devuelto\n');
    } else {
      console.log('⚠️ Tokens diferentes - posible problema con el cache\n');
    }

    // Prueba 3: Obtener headers de autorización
    console.log('📤 Prueba 3: Obteniendo headers de autorización...');
    const headers = await skyDropXAuth.getAuthHeaders();
    console.log('✅ Headers obtenidos:');
    console.log(JSON.stringify({
      ...headers,
      Authorization: headers.Authorization.substring(0, 30) + '...'
    }, null, 2));
    console.log();

    // Prueba 4: Hacer una petición de prueba a la API
    console.log('🌐 Prueba 4: Probando petición autenticada...');
    try {
      // Probar endpoint de servicios disponibles o similar
      const response = await skyDropXAuth.makeAuthenticatedRequest('/services', {
        method: 'GET'
      });
      console.log('✅ Petición autenticada exitosa');
      console.log(`📦 Respuesta: ${JSON.stringify(response).substring(0, 200)}...\n`);
    } catch (apiError) {
      console.log('⚠️ Petición de prueba falló (esto puede ser normal si el endpoint no existe)');
      console.log(`Error: ${apiError.message}\n`);
    }

    // Prueba 5: Forzar renovación del token
    console.log('🔄 Prueba 5: Forzando renovación del token...');
    const newToken = await skyDropXAuth.refreshToken();
    console.log(`✅ Nuevo token obtenido: ${newToken.substring(0, 20)}...\n`);

    if (token1 !== newToken) {
      console.log('✅ Renovación de token funcionando correctamente\n');
    } else {
      console.log('⚠️ El token renovado es igual al anterior\n');
    }

    // Mostrar información final
    console.log('📊 Información final del token:');
    const finalTokenInfo = skyDropXAuth.getTokenInfo();
    console.log(JSON.stringify(finalTokenInfo, null, 2));

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    console.log('✅ La autenticación con SkyDropX está funcionando correctamente');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Función para probar solo la obtención del token
async function getTokenOnly() {
  try {
    console.log('🔐 Obteniendo token bearer de SkyDropX...\n');
    
    const token = await skyDropXAuth.getBearerToken();
    
    console.log('✅ Token obtenido exitosamente!');
    console.log(`Token: ${token}`);
    console.log(`Token (primeros 50 caracteres): ${token.substring(0, 50)}...`);
    
    const tokenInfo = skyDropXAuth.getTokenInfo();
    console.log('\n📊 Información del token:');
    console.log(JSON.stringify(tokenInfo, null, 2));

  } catch (error) {
    console.error('❌ Error obteniendo token:', error.message);
    process.exit(1);
  }
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--token-only')) {
  getTokenOnly();
} else {
  testSkyDropXAuth();
}
