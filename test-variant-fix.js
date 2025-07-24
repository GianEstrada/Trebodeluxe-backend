const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';

async function testVariantFix() {
  console.log('🔧 Probando la corrección del endpoint de variantes...\n');
  
  try {
    // 1. Login como admin
    console.log('1. Iniciando sesión como admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      usuario: 'admin@test.com',
      contrasena: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso\n');
    
    // 2. Obtener lista de productos para encontrar variantes
    console.log('2. Obteniendo productos...');
    const productsResponse = await axios.get(`${BASE_URL}/admin/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (productsResponse.data.products.length === 0) {
      console.log('❌ No hay productos disponibles');
      return;
    }
    
    const product = productsResponse.data.products[0];
    console.log(`✅ Producto encontrado: ${product.nombre} (ID: ${product.id_producto})\n`);
    
    // 3. Probar el endpoint específico que tenía problemas con un ID de variante conocido
    console.log('3. Probando getVariantById directamente (que tenía el error de JSON)...');
    // Vamos a probar con ID 1 que probablemente existe
    const variantDetailResponse = await axios.get(`${BASE_URL}/admin/variants/1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status: ${variantDetailResponse.status}`);
    console.log('Detalle de variante:', JSON.stringify(variantDetailResponse.data, null, 2));
    console.log('\n✅ ¡Corrección exitosa! El endpoint funciona correctamente.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`Status: ${error.response.status}`);
    }
  }
}

testVariantFix();
