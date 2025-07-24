require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testCategorias() {
  try {
    console.log('🧪 Probando APIs de categorías...');
    
    const client = await pool.connect();
    
    // Probar obtener todas las categorías
    const categorias = await client.query('SELECT * FROM categorias ORDER BY nombre');
    console.log('\n📂 Categorías disponibles:');
    categorias.rows.forEach(cat => {
      console.log(`   - ID ${cat.id_categoria}: ${cat.nombre}`);
    });
    
    // Probar crear una nueva categoría
    console.log('\n➕ Probando crear nueva categoría...');
    try {
      const nuevaCategoria = await client.query(
        'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
        ['Test Category', 'Categoría de prueba']
      );
      console.log('✅ Nueva categoría creada:', nuevaCategoria.rows[0].nombre);
      
      // Eliminar la categoría de prueba
      await client.query('DELETE FROM categorias WHERE id_categoria = $1', [nuevaCategoria.rows[0].id_categoria]);
      console.log('🗑️ Categoría de prueba eliminada');
    } catch (createError) {
      console.log('⚠️ Error al crear categoría (probablemente ya existe):', createError.message);
    }
    
    // Probar obtener productos por categoría
    if (categorias.rows.length > 0) {
      const primeraCategoria = categorias.rows[0];
      console.log(`\n🛍️ Productos en categoría "${primeraCategoria.nombre}":`);
      
      const productos = await client.query(`
        SELECT p.nombre, p.descripcion, 
               (SELECT s.precio FROM stock s WHERE s.id_producto = p.id_producto AND s.precio IS NOT NULL LIMIT 1) as precio_base
        FROM productos p 
        WHERE p.id_categoria = $1 AND p.activo = true
        LIMIT 3
      `, [primeraCategoria.id_categoria]);
      
      if (productos.rows.length > 0) {
        productos.rows.forEach(prod => {
          console.log(`   - ${prod.nombre}: $${prod.precio_base || 'Sin precio'}`);
        });
      } else {
        console.log('   (No hay productos en esta categoría)');
      }
    }
    
    client.release();
    console.log('\n✅ Pruebas de categorías completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    pool.end();
  }
}

testCategorias();
