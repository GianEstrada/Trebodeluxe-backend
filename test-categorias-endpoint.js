const { pool } = require('./src/config/db');

async function testCategoriasEndpoint() {
  try {
    console.log('=== Test de Endpoint de Categorías ===');
    
    // Verificar categorías directamente en la BD
    const categorias = await pool.query(`
      SELECT id_categoria, nombre, descripcion, activo
      FROM categorias 
      WHERE activo = true 
      ORDER BY orden ASC, nombre ASC
    `);
    
    console.log(`\n📊 Categorías en BD: ${categorias.rows.length}`);
    categorias.rows.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.nombre} (ID: ${cat.id_categoria})`);
    });
    
    // Test del endpoint
    console.log('\n🌐 Probando endpoint HTTP...');
    try {
      const response = await fetch('https://trebodeluxe-backend.onrender.com/api/categorias');
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Endpoint funciona correctamente');
        console.log(`   Categorías obtenidas: ${data.categorias.length}`);
      } else {
        console.log('❌ Error en endpoint:', data.message || response.statusText);
      }
    } catch (fetchError) {
      console.log('❌ Error conectando al endpoint:', fetchError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

testCategoriasEndpoint();
