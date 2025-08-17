const { pool } = require('./src/config/db');

async function checkPromoAplicacionTable() {
  try {
    console.log('=== Verificando tabla promocion_aplicacion ===');
    
    // Verificar si la tabla existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'promocion_aplicacion'
      );
    `);
    
    console.log('¿Tabla existe?', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Obtener estructura de la tabla
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'promocion_aplicacion' AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      console.log('\n--- Columnas de promocion_aplicacion ---');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
      });
      
      // Verificar datos existentes
      const data = await pool.query('SELECT * FROM promocion_aplicacion LIMIT 5');
      console.log('\n--- Datos de ejemplo ---');
      console.log(data.rows);
      
    } else {
      console.log('❌ La tabla promocion_aplicacion no existe');
      
      // Buscar tablas similares
      const similarTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%promo%'
        ORDER BY table_name
      `);
      
      console.log('\n--- Tablas relacionadas con promociones ---');
      similarTables.rows.forEach(table => {
        console.log(`  ${table.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

checkPromoAplicacionTable();
