require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificarDatos() {
  const client = await pool.connect();
  try {
    console.log('=== VERIFICACIÓN DE DATOS ===');
    
    // Ver todas las categorías
    const categorias = await client.query('SELECT * FROM categorias ORDER BY nombre');
    console.log('\n📂 Todas las categorías:');
    categorias.rows.forEach(cat => console.log(`   - ID ${cat.id_categoria}: ${cat.nombre}`));
    
    // Ver algunos stocks con precios
    const stockConPrecios = await client.query(`
      SELECT s.id_stock, s.precio, s.precio_original, p.nombre as producto 
      FROM stock s 
      JOIN productos p ON s.id_producto = p.id_producto 
      WHERE s.precio IS NOT NULL 
      LIMIT 5
    `);
    console.log('\n💰 Stock con precios migrados:');
    stockConPrecios.rows.forEach(s => {
      console.log(`   - ${s.producto}: $${s.precio} (original: $${s.precio_original})`);
    });
    
    // Ver productos con sus categorías
    const productosConCategorias = await client.query(`
      SELECT p.nombre, c.nombre as categoria 
      FROM productos p 
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
      LIMIT 5
    `);
    console.log('\n🛍️ Productos con categorías asignadas:');
    productosConCategorias.rows.forEach(p => {
      console.log(`   - ${p.nombre}: ${p.categoria || 'Sin categoría'}`);
    });
    
    // Verificar que las variantes ya no tienen precio
    const columnasVariantes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'variantes' 
      AND column_name IN ('precio', 'precio_original')
    `);
    
    console.log('\n🔄 Columnas de precio en variantes (deberían estar vacías):');
    if (columnasVariantes.rows.length === 0) {
      console.log('   ✅ Las columnas precio fueron removidas correctamente de variantes');
    } else {
      console.log('   ⚠️ Aún existen columnas de precio en variantes:', columnasVariantes.rows.map(r => r.column_name));
    }
    
  } finally {
    client.release();
    pool.end();
  }
}

verificarDatos().catch(console.error);
