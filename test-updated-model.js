const ProductModel = require('./src/models/product.model');

async function testUpdatedModel() {
  try {
    console.log('=== PROBANDO PRODUCT MODEL ACTUALIZADO ===\n');
    
    // Probar getVariantById con análisis de precios
    console.log('1. Probando getVariantById...');
    const variant = await ProductModel.getVariantById(4);
    
    if (variant) {
      console.log('✅ Variante encontrada:');
      console.log(`   ID: ${variant.id_variante}`);
      console.log(`   Nombre: ${variant.nombre}`);
      console.log(`   Producto: ${variant.producto_nombre}`);
      console.log(`   Sistema Talla: ${variant.sistema_talla}`);
      console.log(`   Precio Mínimo: ${variant.precio_minimo}`);
      console.log(`   Precio Máximo: ${variant.precio_maximo}`);
      console.log(`   Precios Distintos: ${variant.precios_distintos}`);
      console.log(`   Precio Único: ${variant.precio_unico}`);
      
      console.log('\n   Tallas y Stock:');
      if (variant.tallas_stock && Array.isArray(variant.tallas_stock)) {
        variant.tallas_stock.forEach(talla => {
          console.log(`   ${talla.nombre_talla}: Cantidad ${talla.cantidad}, Precio $${talla.precio || 'Sin precio'}`);
        });
      } else {
        console.log('   No hay información de tallas');
      }
      
      console.log('\n   🎯 INFORMACIÓN PARA EL FRONTEND:');
      if (variant.precio_unico) {
        console.log(`   ✅ Checkbox "Precio único" debe estar MARCADO`);
        console.log(`   ✅ Input debe mostrar: $${variant.precio_minimo}`);
        console.log(`   ✅ Ocultar precios individuales por talla`);
      } else {
        console.log(`   ✅ Checkbox "Precio único" debe estar DESMARCADO`);
        console.log(`   ✅ Mostrar precios individuales por talla`);
        console.log(`   ✅ Rango de precios: $${variant.precio_minimo} - $${variant.precio_maximo}`);
      }
      
    } else {
      console.log('❌ Variante no encontrada');
    }
    
    console.log('\n2. Probando getById...');
    const product = await ProductModel.getById(1);
    
    if (product && product.variantes && product.variantes.length > 0) {
      console.log('✅ Producto encontrado con variantes:');
      product.variantes.forEach((v, index) => {
        console.log(`   Variante ${index + 1}: ${v.nombre}`);
        console.log(`     Precio único: ${v.precio_unico}`);
        if (v.precio_unico) {
          console.log(`     Precio: $${v.precio_minimo}`);
        } else {
          console.log(`     Rango: $${v.precio_minimo} - $${v.precio_maximo}`);
        }
      });
    } else {
      console.log('❌ Producto no encontrado o sin variantes');
    }
    
  } catch (error) {
    console.error('Error en la prueba:', error);
  }
}

testUpdatedModel();
