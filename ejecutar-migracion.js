const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos usando la misma configuración que db.js
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = process.env;
  
  if (DB_HOST && DB_USER && DB_PASS && DB_NAME && DB_PORT) {
    DATABASE_URL = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  } else {
    throw new Error('DATABASE_URL no está definida');
  }
}

console.log('URL de la base de datos:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function ejecutarMigracion() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración de precios y categorías...');
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'src', 'migrations', 'migrate-precio-categorias.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Archivo de migración leído exitosamente');
    
    // Ejecutar la migración
    await client.query(migrationSQL);
    
    console.log('✅ Migración ejecutada exitosamente');
    
    // Verificar resultados
    const verificacion = await client.query(`
      SELECT 
        'Categorías creadas' as tabla,
        COUNT(*) as registros
      FROM categorias
      UNION ALL
      SELECT 
        'Stock con precios' as tabla,
        COUNT(*) as registros
      FROM stock 
      WHERE precio IS NOT NULL
    `);
    
    console.log('📊 Resultados de la migración:');
    verificacion.rows.forEach(row => {
      console.log(`   ${row.tabla}: ${row.registros} registros`);
    });
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar la migración
ejecutarMigracion()
  .then(() => {
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en la migración:', error);
    process.exit(1);
  });
