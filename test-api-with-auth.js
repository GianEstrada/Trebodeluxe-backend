// test-api-with-auth.js
require('dotenv').config();
const https = require('https');

// Primera función: obtener token
function getAdminToken() {
  return new Promise((resolve, reject) => {
    const loginData = JSON.stringify({
      usuario: 'admin',
      contrasena: 'admin123'
    });

    const options = {
      hostname: 'trebodeluxe-backend.onrender.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('🔐 Login response status:', res.statusCode);
          if (response.token) {
            console.log('✅ Token obtenido exitosamente');
            resolve(response.token);
          } else {
            console.log('❌ No token in response:', response);
            reject(new Error('No token in response'));
          }
        } catch (err) {
          console.log('❌ Error parsing login response:', data);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Error en login request:', err);
      reject(err);
    });

    req.write(loginData);
    req.end();
  });
}

// Segunda función: probar endpoints con token
function testOrdersEndpoints(token) {
  console.log('\n📋 Testing orders endpoints...');
  
  // Test /api/admin/orders
  const options1 = {
    hostname: 'trebodeluxe-backend.onrender.com',
    port: 443,
    path: '/api/admin/orders',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const req1 = https.request(options1, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`\n📊 GET /api/admin/orders - Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          console.log('✅ Orders retrieved successfully');
          console.log(`📦 Total orders: ${response.total || 'N/A'}`);
          console.log(`📄 Current page orders: ${response.data ? response.data.length : 'N/A'}`);
          if (response.data && response.data.length > 0) {
            console.log('📝 Sample order:', {
              id: response.data[0].id,
              cliente: response.data[0].cliente_nombre,
              estado: response.data[0].estado,
              total: response.data[0].total
            });
          }
        } catch (err) {
          console.log('📄 Raw response (non-JSON):', data.substring(0, 500));
        }
      } else {
        console.log('❌ Error response:', data);
      }
    });
  });

  req1.on('error', (err) => console.log('❌ Error in orders request:', err));
  req1.end();

  // Test /api/admin/orders/stats
  setTimeout(() => {
    const options2 = {
      hostname: 'trebodeluxe-backend.onrender.com',
      port: 443,
      path: '/api/admin/orders/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req2 = https.request(options2, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`\n📈 GET /api/admin/orders/stats - Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ Stats retrieved successfully');
            console.log('📊 Stats:', response);
          } catch (err) {
            console.log('📄 Raw stats response:', data);
          }
        } else {
          console.log('❌ Stats error response:', data);
        }
      });
    });

    req2.on('error', (err) => console.log('❌ Error in stats request:', err));
    req2.end();
  }, 1000);
}

// Ejecutar la prueba
console.log('🧪 Starting API test with authentication...');
getAdminToken()
  .then(token => testOrdersEndpoints(token))
  .catch(err => console.log('❌ Test failed:', err));
