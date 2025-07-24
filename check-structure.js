require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkStructure() {
  console.log('🔌 Conectando a la base de datos...');
  const client = await pool.connect();
  console.log('✅ Conectado exitosamente');
  
  try {
    // Verificar estructura de tabla stock
    const stockResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Estructura de tabla stock:');
    stockResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar algunos registros de stock
    const stockData = await client.query(`
      SELECT id_stock, cantidad, precio 
      FROM stock 
      WHERE precio IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('\n💰 Registros de stock con precio:');
    stockData.rows.forEach(row => {
      console.log(`  Stock ID ${row.id_stock}: cantidad=${row.cantidad}, precio=${row.precio}`);
    });
    
    // Verificar algunas categorías
    const catData = await client.query(`
      SELECT id_categoria, nombre 
      FROM categorias 
      LIMIT 5
    `);
    
    console.log('\n📁 Categorías creadas:');
    catData.rows.forEach(row => {
      console.log(`  ${row.id_categoria}: ${row.nombre}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

checkStructure();
