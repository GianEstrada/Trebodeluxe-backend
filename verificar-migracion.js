require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  const client = await pool.connect();
  try {
    console.log('=== VERIFICACIÓN DE MIGRACIÓN ===');
    
    // Verificar tabla categorías
    const categorias = await client.query('SELECT * FROM categorias ORDER BY id');
    console.log('\n📂 Categorías creadas:');
    categorias.rows.forEach(cat => console.log(`   - ${cat.id}: ${cat.nombre}`));
    
    // Verificar columnas de precio en stock
    const stockConPrecios = await client.query('SELECT id, precio, precio_original FROM stock LIMIT 5');
    console.log('\n💰 Stock con precios (primeros 5):');
    stockConPrecios.rows.forEach(s => console.log(`   - Stock ID ${s.id}: ${s.precio} (original: ${s.precio_original})`));
    
    // Verificar productos con categorías
    const productos = await client.query('SELECT p.id, p.nombre, c.nombre as categoria FROM productos p LEFT JOIN categorias c ON p.id_categoria = c.id LIMIT 5');
    console.log('\n🛍️ Productos con categorías (primeros 5):');
    productos.rows.forEach(p => console.log(`   - ${p.nombre}: ${p.categoria || 'Sin categoría'}`));
    
    // Verificar estructura de variantes (ya no debe tener precio)
    const variantes = await client.query('SELECT id, nombre FROM variantes LIMIT 3');
    console.log('\n🔄 Variantes (ya sin precios):');
    variantes.rows.forEach(v => console.log(`   - ${v.id}: ${v.nombre}`));
    
  } finally {
    client.release();
    pool.end();
  }
}

verificar().catch(console.error);
