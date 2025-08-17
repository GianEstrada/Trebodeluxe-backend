const { pool } = require('./src/config/db');

async function checkProductsSchema() {
  try {
    console.log('=== Verificando estructura de tabla productos ===');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'productos' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('--- Columnas existentes ---');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // Ver algunos datos de ejemplo
    console.log('\n--- Datos de ejemplo ---');
    const sampleData = await pool.query('SELECT * FROM productos LIMIT 3');
    console.log(sampleData.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkProductsSchema();
