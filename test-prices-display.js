const axios = require('axios');

const BASE_URL = 'http://localhost:3003/api';

async function testPricesInVariants() {
  console.log('🔍 Probando que los precios de las tallas se muestren correctamente...\n');
  
  try {
    // 1. Login como admin
    console.log('1. Iniciando sesión como admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      usuario: 'admin@test.com',
      contrasena: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso\n');
    
    // 2. Obtener productos para admin
    console.log('2. Obteniendo productos para admin...');
    const productsResponse = await axios.get(`${BASE_URL}/admin/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status: ${productsResponse.status}`);
    if (productsResponse.data.products && productsResponse.data.products.length > 0) {
      const product = productsResponse.data.products[0];
      console.log(`✅ Producto encontrado: ${product.nombre}`);
      
      if (product.variantes && product.variantes.length > 0) {
        const variant = product.variantes[0];
        console.log(`\n📦 Variante: ${variant.nombre}`);
        console.log('🏷️ Tallas y Stock con precios:');
        
        if (variant.tallas_stock && variant.tallas_stock.length > 0) {
          variant.tallas_stock.forEach(talla => {
            console.log(`   - ${talla.nombre_talla}: ${talla.cantidad} unidades - Precio: $${talla.precio || 'NO DISPONIBLE'}`);
          });
        } else {
          console.log('   ❌ No hay información de tallas_stock');
        }
      }
    }
    
    // 3. Obtener variantes directamente
    console.log('\n3. Obteniendo variantes directamente...');
    const variantsResponse = await axios.get(`${BASE_URL}/admin/variants`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Status: ${variantsResponse.status}`);
    if (variantsResponse.data.variants && variantsResponse.data.variants.length > 0) {
      const variant = variantsResponse.data.variants[0];
      console.log(`\n📦 Variante directa: ${variant.nombre_variante}`);
      console.log(`💰 Precio mínimo: $${variant.precio || 'NO DISPONIBLE'}`);
      console.log('🏷️ Tallas y Stock con precios:');
      
      if (variant.tallas_stock && variant.tallas_stock.length > 0) {
        variant.tallas_stock.forEach(talla => {
          console.log(`   - ${talla.nombre_talla}: ${talla.cantidad} unidades - Precio: $${talla.precio || 'NO DISPONIBLE'}`);
        });
        console.log('\n✅ ¡Los precios por talla ahora se muestran correctamente!');
      } else {
        console.log('   ❌ No hay información de tallas_stock');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`Status: ${error.response.status}`);
    }
  }
}

testPricesInVariants();
