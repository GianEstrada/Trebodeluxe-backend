// check-size-systems.js
require('dotenv').config();
const { Pool } = require('pg');

async function checkSizeSystems() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    console.log('📏 Estructura de sistemas_talla:');
    const structure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sistemas_talla' 
      ORDER BY ordinal_position
    `);
    
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n📏 Datos en sistemas_talla:');
    const data = await client.query('SELECT * FROM sistemas_talla LIMIT 5');
    console.log(data.rows);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSizeSystems();
