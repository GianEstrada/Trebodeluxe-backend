// test-frontend-api-calls.js
const fetch = require('node-fetch');

const BASE_URL = 'https://trebodeluxe-backend.onrender.com';

async function testOrdersAPI() {
  try {
    console.log('🧪 Probando las APIs de pedidos como lo haría el frontend...');
    
    // Test 1: Stats endpoint
    console.log('\n1. Probando /api/admin/orders/stats');
    try {
      const statsResponse = await fetch(`${BASE_URL}/api/admin/orders/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', statsResponse.status);
      console.log('   Status Text:', statsResponse.statusText);
      
      if (statsResponse.status === 401) {
        console.log('   ❌ Sin autenticación - esto es esperado');
      }
      
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    // Test 2: Orders list endpoint
    console.log('\n2. Probando /api/admin/orders');
    try {
      const ordersResponse = await fetch(`${BASE_URL}/api/admin/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', ordersResponse.status);
      console.log('   Status Text:', ordersResponse.statusText);
      
      if (ordersResponse.status === 401) {
        console.log('   ❌ Sin autenticación - esto es esperado');
      }
      
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    // Test 3: Health check
    console.log('\n3. Probando /api/health');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   Status:', healthResponse.status);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('   ✅ Servidor funcionando');
        console.log('   Database:', healthData.database);
      }
      
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    console.log('\n🔍 Análisis:');
    console.log('- Si ves errores 401, es normal - las rutas requieren autenticación');
    console.log('- El problema puede estar en el frontend (falta token) o en CORS');
    console.log('- Revisa la consola del navegador para más detalles');
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

testOrdersAPI();
