const { pool } = require('./src/config/db');

async function testProductDropdown() {
  try {
    console.log('=== Test: Endpoint de Productos Dropdown ===');
    
    // Test 1: Obtener todos los productos (sin búsqueda)
    console.log('\n1. Obteniendo todos los productos...');
    const allProducts = await pool.query(`
      SELECT 
        id_producto,
        nombre,
        descripcion,
        marca,
        activo
      FROM productos
      ORDER BY nombre ASC
      LIMIT 10
    `);
    
    console.log(`   Productos encontrados: ${allProducts.rows.length}`);
    allProducts.rows.forEach(p => {
      const label = `${p.id_producto} - ${p.nombre}`;
      console.log(`   ✓ ${label} (${p.marca}) - ${p.activo ? 'Activo' : 'Inactivo'}`);
    });

    // Test 2: Búsqueda por nombre
    console.log('\n2. Búsqueda por término "lucky"...');
    const searchResults = await pool.query(`
      SELECT 
        id_producto,
        nombre,
        descripcion,
        marca,
        activo
      FROM productos
      WHERE LOWER(nombre) LIKE LOWER($1)
      ORDER BY nombre ASC
      LIMIT 10
    `, ['%lucky%']);
    
    console.log(`   Productos con "lucky": ${searchResults.rows.length}`);
    searchResults.rows.forEach(p => {
      const label = `${p.id_producto} - ${p.nombre}`;
      console.log(`   ✓ ${label}`);
    });

    // Test 3: Verificar estructura esperada por el frontend
    console.log('\n3. Formato esperado por el frontend...');
    const sampleProducts = allProducts.rows.slice(0, 3).map(product => ({
      id: product.id_producto,
      label: `${product.id_producto} - ${product.nombre}`,
      nombre: product.nombre,
      descripcion: product.descripcion,
      marca: product.marca,
      activo: product.activo
    }));
    
    console.log('   Formato JSON esperado:');
    console.log(JSON.stringify(sampleProducts, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

testProductDropdown();
