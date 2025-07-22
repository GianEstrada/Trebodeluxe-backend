const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a/trebolux_db'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración para configuraciones del sitio...');
    
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'src/migrations/create_site_settings.sql'), 'utf8');
    
    console.log('📝 Ejecutando SQL de migración...');
    await client.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar que se crearon los datos
    const result = await client.query('SELECT * FROM configuraciones_sitio ORDER BY clave');
    console.log('📋 Configuraciones creadas:');
    result.rows.forEach(row => {
      console.log(` - ${row.clave}: ${row.valor}`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error en migración:', error);
    process.exit(1);
  });
