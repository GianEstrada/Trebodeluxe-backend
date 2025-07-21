const ProductModel = require('./src/models/product.model');
const SizesModel = require('./src/models/sizes.model');

async function testFixes() {
  console.log('=== PROBANDO CORRECCIONES ===\n');
  
  try {
    // Probar getRecentByCategory
    console.log('1. Probando getRecentByCategory...');
    const recentByCategory = await ProductModel.getRecentByCategory(2);
    console.log('✅ getRecentByCategory OK - Categorías encontradas:', recentByCategory.length);
    
    // Mostrar estructura
    recentByCategory.forEach(cat => {
      console.log(`   - ${cat.categoria}: ${cat.productos.length} productos`);
    });
    
    console.log('\n2. Probando SizesModel.getAllSystems...');
    const systems = await SizesModel.getAllSystems();
    console.log('✅ getAllSystems OK - Sistemas encontrados:', systems.length);
    systems.forEach(sys => {
      console.log(`   - Sistema: ${sys.nombre} (ID: ${sys.id_sistema_talla})`);
    });
    
    console.log('\n3. Probando SizesModel.getAllSizes...');
    const sizes = await SizesModel.getAllSizes();
    console.log('✅ getAllSizes OK - Tallas encontradas:', sizes.length);
    sizes.slice(0, 5).forEach(size => {
      console.log(`   - Talla: ${size.nombre_talla} (Sistema: ${size.id_sistema_talla}, Orden: ${size.orden})`);
    });
    
    console.log('\n🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
    
  } catch (error) {
    console.error('❌ ERROR EN LAS PRUEBAS:', error.message);
    console.error('Detalles:', error);
  }
  
  process.exit(0);
}

testFixes();
