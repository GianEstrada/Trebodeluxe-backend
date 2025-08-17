const { pool } = require('./src/config/db');

async function checkPromoCodigoColumns() {
  try {
    console.log('=== Verificando columnas de promo_codigo ===');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promo_codigo' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('--- Columnas existentes ---');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // Verificar si faltan columnas específicas
    const existingColumns = columns.rows.map(col => col.column_name);
    const requiredColumns = ['descuento', 'tipo_descuento'];
    
    console.log('\n--- Columnas requeridas por el controlador ---');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  ${col}: ${exists ? '✅ Existe' : '❌ Falta'}`);
    });
    
    console.log('\n--- Datos de ejemplo ---');
    const data = await pool.query('SELECT * FROM promo_codigo LIMIT 3');
    console.log(data.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkPromoCodigoColumns();
