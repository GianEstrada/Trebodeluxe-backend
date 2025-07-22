// Test script para verificar la funcionalidad del admin
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

// Función helper para hacer requests HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testAdminFunctionality() {
  try {
    console.log('🚀 Iniciando pruebas del sistema admin...\n');

    // 1. Primero, intentar registrar un usuario admin
    console.log('1. Registrando usuario admin...');
    const registerData = {
      nombres: 'Admin',
      apellidos: 'Test',
      correo: 'admin@test.com',
      usuario: 'admin',
      contrasena: 'admin123',
      rol: 1 // Admin role
    };

    try {
      const registerResponse = await makeRequest(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: registerData
      });
      
      console.log('Registro:', registerResponse.status, registerResponse.data.message || registerResponse.data.error);
    } catch (error) {
      console.log('Error en registro (posiblemente usuario ya existe):', error.message);
    }

    // 2. Login para obtener token
    console.log('\n2. Iniciando sesión...');
    const loginData = {
      usuario: 'admin',
      contrasena: 'admin123'
    };

    const loginResponse = await makeRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: loginData
    });

    console.log('Login response completo:', JSON.stringify(loginResponse, null, 2));

    if (!loginResponse.data.success) {
      console.log('❌ Error en login:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.data?.token || loginResponse.data.token;
    console.log('✅ Login exitoso, token obtenido:', token ? 'SÍ' : 'NO');

    // 3. Probar endpoint de productos admin
    console.log('\n3. Probando endpoint de productos admin...');
    const productsResponse = await makeRequest(`${BASE_URL}/admin/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Productos response status:', productsResponse.status);
    console.log('Productos result:', JSON.stringify(productsResponse.data, null, 2));

    // 4. Probar endpoint de tallas
    console.log('\n4. Probando endpoint de tallas...');
    const sizesResponse = await makeRequest(`${BASE_URL}/sizes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Tallas response status:', sizesResponse.status);
    console.log('Tallas result:', JSON.stringify(sizesResponse.data, null, 2));

    // 5. Probar endpoint de sistemas de tallas
    console.log('\n5. Probando endpoint de sistemas de tallas...');
    const systemsResponse = await makeRequest(`${BASE_URL}/sizes/systems`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Sistemas response status:', systemsResponse.status);
    console.log('Sistemas result:', JSON.stringify(systemsResponse.data, null, 2));

    console.log('\n✅ Pruebas completadas!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testAdminFunctionality();
