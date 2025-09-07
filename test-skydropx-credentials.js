const axios = require('axios');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

async function testSkyDropXCredentials() {
  console.log('🔑 ========================================');
  console.log('🔑 VERIFICANDO CREDENCIALES SKYDROPX');
  console.log('🔑 ========================================');
  
  const clientId = process.env.SKYDROP_API_KEY;
  const clientSecret = process.env.SKYDROP_API_SECRET;
  
  console.log('📋 Cliente ID:', clientId ? `${clientId.substring(0, 8)}...` : 'NO ENCONTRADO');
  console.log('📋 Cliente Secret:', clientSecret ? `${clientSecret.substring(0, 8)}...` : 'NO ENCONTRADO');
  console.log('');

  if (!clientId || !clientSecret) {
    console.error('❌ Credenciales no encontradas');
    return;
  }

  // Preparar datos para la autenticación OAuth2
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');
  params.append('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
  params.append('refresh_token', '');
  params.append('scope', 'default orders.create');

  console.log('📤 Datos de autenticación preparados:');
  console.log('   - client_id: ✅');
  console.log('   - client_secret: ✅');
  console.log('   - grant_type: client_credentials');
  console.log('   - scope: default orders.create');
  console.log('');

  try {
    console.log('📡 Enviando solicitud a: https://pro.skydropx.com/api/v1/oauth/token');
    
    const response = await axios.post(
      'https://pro.skydropx.com/api/v1/oauth/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ AUTENTICACIÓN EXITOSA');
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.access_token) {
      console.log('🔑 Token obtenido exitosamente');
      console.log('⏱️  Expira en:', response.data.expires_in, 'segundos');
      
      // Probar una petición simple con el token
      await testQuotationWithToken(response.data.access_token);
    }

  } catch (error) {
    console.log('❌ ERROR EN AUTENTICACIÓN');
    console.log('📊 Status:', error.response?.status || 'Sin status');
    console.log('📋 Status Text:', error.response?.statusText || 'Sin status text');
    console.log('🔍 Headers:', JSON.stringify(error.response?.headers || {}, null, 2));
    console.log('📄 Response Data:', JSON.stringify(error.response?.data || {}, null, 2));
    console.log('📝 Error Message:', error.message);
  }
}

async function testQuotationWithToken(token) {
  console.log('');
  console.log('🧪 ===== PROBANDO COTIZACIÓN CON TOKEN =====');
  
  // Payload mínimo de prueba
  const testPayload = {
    quotation: {
      order_id: `test_auth_${Date.now()}`,
      address_from: {
        country_code: "MX",
        postal_code: "64000",
        area_level1: "Nuevo León",
        area_level2: "Monterrey",
        area_level3: "Monterrey Centro"
      },
      address_to: {
        country_code: "US",
        postal_code: "10001",
        area_level1: "New York",
        area_level2: "New York",
        area_level3: "Manhattan"
      },
      parcels: [{
        length: 20,
        width: 15,
        height: 10,
        weight: 1,
        declared_value: 100,
        description: "Test clothing item"
      }],
      shipment_type: "package",
      quote_type: "carrier"
    }
  };

  try {
    console.log('📤 Enviando cotización de prueba (SIN productos/HS codes)...');
    
    const response = await axios.post(
      'https://pro.skydropx.com/api/v1/quotations',
      testPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ COTIZACIÓN EXITOSA (estructura básica)');
    console.log('📊 Status:', response.status);
    console.log('📋 Cotizaciones encontradas:', response.data?.data?.length || 0);

  } catch (error) {
    console.log('❌ ERROR EN COTIZACIÓN BÁSICA');
    console.log('📊 Status:', error.response?.status || 'Sin status');
    console.log('📄 Response:', JSON.stringify(error.response?.data || {}, null, 2));
  }
}

// Ejecutar test
testSkyDropXCredentials();
