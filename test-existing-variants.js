const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';

async function findExistingVariant() {
  console.log('🔍 Buscando variantes existentes...\n');
  
  try {
    // 1. Login como admin
    console.log('1. Iniciando sesión como admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      usuario: 'admin@test.com',
      contrasena: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso\n');
    
    // 2. Obtener todas las variantes disponibles
    console.log('2. Obteniendo todas las variantes...');
    const variantsResponse = await axios.get(`${BASE_URL}/admin/variants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status: ${variantsResponse.status}`);
    console.log('Variantes encontradas:', JSON.stringify(variantsResponse.data, null, 2));
    
    if (variantsResponse.data.variants && variantsResponse.data.variants.length > 0) {
      const firstVariant = variantsResponse.data.variants[0];
      console.log(`\n3. Probando getVariantById con ID existente: ${firstVariant.id_variante}...`);
      
      const variantDetailResponse = await axios.get(`${BASE_URL}/admin/variants/${firstVariant.id_variante}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Status: ${variantDetailResponse.status}`);
      console.log('Detalle de variante:', JSON.stringify(variantDetailResponse.data, null, 2));
      console.log('\n✅ ¡CORRECCIÓN EXITOSA! El endpoint funciona sin errores de JSON GROUP BY.');
      
    } else {
      console.log('❌ No se encontraron variantes en el sistema');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`Status: ${error.response.status}`);
    }
  }
}

findExistingVariant();
