// check-postal-tables.js
const db = require('./src/config/db');

async function checkTables() {
  try {
    // Verificar tablas existentes relacionadas con códigos postales
    const tablesResult = await db.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%postal%' OR table_name LIKE '%colonia%' OR table_name LIKE '%cp%')
    `);
    
    console.log('📋 Tablas relacionadas con CP/Colonias:', tablesResult.rows);
    
    // Verificar estructura de informacion_envio
    const infoEnvioResult = await db.pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'informacion_envio'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura tabla informacion_envio:');
    infoEnvioResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();
