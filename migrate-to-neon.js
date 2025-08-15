// migrate-to-neon.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrateToNeon() {
  console.log('🚀 Iniciando migración completa a Neon DB...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a Neon DB');
    
    // Leer el esquema completo
    console.log('📖 Leyendo esquema completo...');
    const schemaPath = path.join(__dirname, 'src/config/complete_schema_with_promotions.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Dividir en sentencias individuales (por punto y coma)
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Ejecutando ${statements.length} sentencias SQL...`);
    
    // Ejecutar cada sentencia
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX')) {
        const tableName = statement.match(/CREATE (?:TABLE|INDEX) (?:IF NOT EXISTS )?(\w+)/);
        console.log(`  ${i + 1}/${statements.length}: ${tableName ? tableName[1] : 'SQL statement'}`);
      } else if (statement.includes('CREATE EXTENSION')) {
        console.log(`  ${i + 1}/${statements.length}: Extension UUID`);
      } else if (statement.includes('DROP TABLE')) {
        console.log(`  ${i + 1}/${statements.length}: Drop tables`);
      } else {
        console.log(`  ${i + 1}/${statements.length}: SQL statement`);
      }
      
      try {
        await client.query(statement + ';');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`    ⚠️  Elemento ya existe, continuando...`);
        } else {
          console.error(`    ❌ Error:`, error.message);
          // Continuar con las siguientes sentencias para no parar la migración
        }
      }
    }
    
    console.log('✅ Esquema ejecutado exitosamente');
    
    // Verificar las tablas creadas
    console.log('🔍 Verificando tablas creadas...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Tablas creadas: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`  ✅ ${row.table_name}`));
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await pool.end();
  }
}

migrateToNeon();
