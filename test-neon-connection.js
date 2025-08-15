// test-neon-connection.js
require('dotenv').config();
const { Pool } = require('pg');

async function testNeonConnection() {
  console.log('🧪 Probando conexión a Neon DB...');
  
  try {
    console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL);
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    console.log('🔌 Conectando a Neon...');
    const client = await pool.connect();
    
    console.log('✅ Conexión exitosa a Neon DB');
    
    // Probar query básica
    const result = await client.query('SELECT NOW() as tiempo_actual, version() as version_db');
    console.log('🕐 Tiempo actual del servidor:', result.rows[0].tiempo_actual);
    console.log('📦 Versión de PostgreSQL:', result.rows[0].version_db.split(' ')[0]);
    
    // Verificar si existen tablas
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Tablas existentes: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    client.release();
    await pool.end();
    
    console.log('🎉 Conexión a Neon DB exitosa!');
    return true;
    
  } catch (error) {
    console.error('❌ Error conectando a Neon:', error.message);
    return false;
  }
}

testNeonConnection();
