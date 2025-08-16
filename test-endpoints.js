// Test para verificar que los endpoints de admin funcionan correctamente
const fetch = require('node-fetch');

async function testAdminEndpoints() {
  console.log('🔍 Probando endpoints de admin...');
  
  try {
    // Probar endpoint de variantes
    console.log('\n📦 Probando /api/admin/variants...');
    const variantsResponse = await fetch('http://localhost:5000/api/admin/variants', {
      headers: {
        'Authorization': 'Bearer dummy-token-for-test'
      }
    });
    
    console.log('Status:', variantsResponse.status);
    if (variantsResponse.status === 401) {
      console.log('❌ Error de autenticación - necesitas un token válido');
      console.log('Pero el endpoint está funcionando');
    }
    
    // Probar endpoint de productos
    console.log('\n🛍️ Probando /api/admin/products...');
    const productsResponse = await fetch('http://localhost:5000/api/admin/products', {
      headers: {
        'Authorization': 'Bearer dummy-token-for-test'
      }
    });
    
    console.log('Status:', productsResponse.status);
    if (productsResponse.status === 401) {
      console.log('❌ Error de autenticación - necesitas un token válido');
      console.log('Pero el endpoint está funcionando');
    }
    
  } catch (error) {
    console.error('❌ Error probando endpoints:', error.message);
  }
}

testAdminEndpoints();
