const db = require('./src/config/db');

(async () => {
  try {
    console.log('🔍 Verificando estructura de la tabla informacion_envio...');
    
    const result = await db.pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'informacion_envio' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estructura de la tabla informacion_envio:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    // También verificar si existe alguna columna relacionada con fecha
    const dateColumns = await db.pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'informacion_envio' 
      AND (column_name LIKE '%fecha%' OR column_name LIKE '%actualizacion%')
      ORDER BY column_name;
    `);
    
    console.log('\n📅 Columnas relacionadas con fecha/actualización en informacion_envio:');
    if (dateColumns.rows.length > 0) {
      dateColumns.rows.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('- No se encontraron columnas de fecha/actualización');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
