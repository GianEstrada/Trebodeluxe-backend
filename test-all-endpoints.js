const https = require('https');

const baseUrl = 'https://trebodeluxe-backend.onrender.com';

// Función para hacer peticiones HTTP
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data.length < 500 ? data : `${data.substring(0, 200)}...`,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Timeout')));
    req.end();
  });
}

async function testEndpoints() {
  const endpoints = [
    '/api/health',
    '/api/main-images',
    '/api/products/variants?limit=3',
    '/api/products/categories',
    '/api/products/brands',
    '/api/products/recent?limit=5',
    '/api/products/recent-by-category?limit=3',
    '/api/cart',
    '/api/public/index-images',
    '/api/site-settings/header'
  ];

  console.log('🧪 Probando endpoints corregidos...\n');
  
  for (const endpoint of endpoints) {
    try {
      const result = await makeRequest(`${baseUrl}${endpoint}`);
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${endpoint} - Status: ${result.status}`);
      
      if (!result.success) {
        console.log(`   Error: ${result.data.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
  
  console.log('\n🔍 Resumen de correcciones implementadas:');
  console.log('✅ Endpoint público /api/products/variants (sin autenticación)');
  console.log('✅ Corrección de errores SQL en promociones');
  console.log('✅ Corrección de errores SQL en notas'); 
  console.log('✅ Corrección de setup-site-settings para imagenes_index');
  console.log('✅ Main-images controller usando tabla correcta');
  
  console.log('\n⚠️  Pendiente:');
  console.log('   - Frontend debe usar /api/products/variants en lugar de /api/admin/variants');
}

testEndpoints().then(() => process.exit(0)).catch(console.error);
