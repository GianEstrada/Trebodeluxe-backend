const { pool } = require('./src/config/db');

async function checkTables() {
  try {
    console.log('=== Estructura de tabla promociones ===');
    const result1 = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promociones' 
      ORDER BY ordinal_position
    `);
    console.log(result1.rows);
    
    console.log('\n=== Estructura de tabla promo_porcentaje ===');
    const result2 = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promo_porcentaje' 
      ORDER BY ordinal_position
    `);
    console.log(result2.rows);
    
    console.log('\n=== Estructura de tabla promo_codigo ===');
    const result3 = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promo_codigo' 
      ORDER BY ordinal_position
    `);
    console.log(result3.rows);
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}
checkTables();
