const { pool } = require('./src/config/db');

async function checkPromoPercentageColumns() {
  try {
    console.log('=== Verificando tabla promo_porcentaje ===');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promo_porcentaje' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('--- Columnas existentes ---');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // Verificar si faltan columnas específicas
    const existingColumns = columns.rows.map(col => col.column_name);
    const requiredColumns = ['porcentaje', 'porcentaje_descuento'];
    
    console.log('\n--- Análisis de columnas requeridas ---');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  ${col}: ${exists ? '✅ Existe' : '❌ Falta'}`);
    });
    
    console.log('\n--- Datos de ejemplo ---');
    const data = await pool.query('SELECT * FROM promo_porcentaje LIMIT 3');
    console.log(data.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkPromoPercentageColumns();