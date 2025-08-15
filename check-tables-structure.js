// check-tables-structure.js
require('dotenv').config();
const { Pool } = require('pg');

async function checkTablesStructure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    // Verificar estructura de productos
    console.log('📋 Estructura de tabla productos:');
    const productos = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position
    `);
    productos.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    // Verificar estructura de promociones
    console.log('\n🏷️ Estructura de tabla promociones:');
    const promociones = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promociones' 
      ORDER BY ordinal_position
    `);
    promociones.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    // Verificar estructura de categorias
    console.log('\n📂 Estructura de tabla categorias:');
    const categorias = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
      ORDER BY ordinal_position
    `);
    categorias.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    // Verificar estructura de pedidos
    console.log('\n📦 Estructura de tabla pedidos:');
    const pedidos = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pedidos' 
      ORDER BY ordinal_position
    `);
    pedidos.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTablesStructure();
