const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testPrecioUnico() {
  try {
    console.log('🧪 Testing Precio Único functionality...\n');

    // 1. Primero obtener información de una variante
    console.log('1. Obteniendo información de variante 4...');
    const variantResponse = await axios.get(`${BASE_URL}/admin/variants/4`);
    const variant = variantResponse.data.variant;
    
    console.log('Variante actual:');
    console.log(`- ID: ${variant.id_variante}`);
    console.log(`- Nombre: ${variant.nombre}`);
    console.log(`- Precio único actual: ${variant.precio_unico}`);
    console.log(`- Precio mínimo: $${variant.precio_minimo}`);
    console.log(`- Precio máximo: $${variant.precio_maximo}`);
    console.log(`- Tallas actuales:`, variant.tallas_stock.map(t => `${t.nombre_talla}: $${t.precio}`));
    console.log();

    // 2. Actualizar con precio único
    console.log('2. Actualizando con precio único de $650...');
    const updateData = {
      precio_unico: true,
      precio: 650.00,
      tallas: variant.tallas_stock.map(talla => ({
        id_talla: talla.id_talla,
        cantidad: talla.cantidad
      }))
    };

    const updateResponse = await axios.put(`${BASE_URL}/admin/variants/4`, updateData);
    console.log('Respuesta de actualización:', updateResponse.data);
    console.log();

    // 3. Verificar que se aplicó correctamente
    console.log('3. Verificando que el precio único se aplicó...');
    const verifyResponse = await axios.get(`${BASE_URL}/admin/variants/4`);
    const updatedVariant = verifyResponse.data.variant;
    
    console.log('Variante después de la actualización:');
    console.log(`- Precio único: ${updatedVariant.precio_unico}`);
    console.log(`- Precio mínimo: $${updatedVariant.precio_minimo}`);
    console.log(`- Precio máximo: $${updatedVariant.precio_maximo}`);
    console.log(`- Tallas actualizadas:`, updatedVariant.tallas_stock.map(t => `${t.nombre_talla}: $${t.precio}`));
    
    // Verificar que todos los precios son iguales
    const precios = updatedVariant.tallas_stock.map(t => t.precio);
    const preciosUnicos = [...new Set(precios)];
    
    if (preciosUnicos.length === 1 && preciosUnicos[0] === 650) {
      console.log('✅ SUCCESS: Precio único aplicado correctamente a todas las tallas!');
    } else {
      console.log('❌ ERROR: El precio único no se aplicó correctamente');
      console.log('Precios únicos encontrados:', preciosUnicos);
    }
    console.log();

    // 4. Probar actualización sin enviar tallas (solo precio_unico y precio)
    console.log('4. Probando actualización sin tallas específicas...');
    const simpleUpdateData = {
      precio_unico: true,
      precio: 700.00
    };

    const simpleUpdateResponse = await axios.put(`${BASE_URL}/admin/variants/4`, simpleUpdateData);
    console.log('Respuesta de actualización simple:', simpleUpdateResponse.data);
    console.log();

    // 5. Verificar la actualización simple
    console.log('5. Verificando actualización simple...');
    const finalVerifyResponse = await axios.get(`${BASE_URL}/admin/variants/4`);
    const finalVariant = finalVerifyResponse.data.variant;
    
    console.log('Variante después de actualización simple:');
    console.log(`- Precio único: ${finalVariant.precio_unico}`);
    console.log(`- Precio mínimo: $${finalVariant.precio_minimo}`);
    console.log(`- Precio máximo: $${finalVariant.precio_maximo}`);
    console.log(`- Tallas finales:`, finalVariant.tallas_stock.map(t => `${t.nombre_talla}: $${t.precio}`));
    
    // Verificar que todos los precios son $700
    const preciosFinales = finalVariant.tallas_stock.map(t => t.precio);
    const preciosUnicosFinales = [...new Set(preciosFinales)];
    
    if (preciosUnicosFinales.length === 1 && preciosUnicosFinales[0] === 700) {
      console.log('✅ SUCCESS: Actualización simple de precio único funcionó correctamente!');
    } else {
      console.log('❌ ERROR: La actualización simple no funcionó');
      console.log('Precios únicos encontrados:', preciosUnicosFinales);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
  }
}

// Ejecutar prueba
testPrecioUnico();
