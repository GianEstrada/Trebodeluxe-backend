// check-categories.js
require('dotenv').config();
const { Pool } = require('pg');

async function checkCategories() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    console.log('📂 Categorías disponibles:');
    const result = await client.query('SELECT id_categoria, nombre FROM categorias ORDER BY nombre');
    result.rows.forEach(cat => {
      console.log(`  ${cat.id_categoria}: ${cat.nombre}`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCategories();
