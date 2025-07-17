const { Client } = require('pg');

async function findCorrectDatabase() {
  console.log('🔍 Buscando la base de datos correcta...\n');

  // Posibles nombres de base de datos que Render podría haber creado
  const possibleDatabases = [
    'trebolux_usr',
    'trebolux',
    'treboluxe',
    'default',
    'main',
    'app',
    'production'
  ];

  const baseConfig = {
    host: 'dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com',
    port: 5432,
    user: 'trebolux_usr',
    password: 'nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR',
    ssl: { rejectUnauthorized: false }
  };

  for (const dbName of possibleDatabases) {
    console.log(`\n📊 Probando base de datos: ${dbName}`);
    const client = new Client({ ...baseConfig, database: dbName });
    
    try {
      await client.connect();
      console.log(`✅ Conexión exitosa a ${dbName}`);
      
      // Probar crear una tabla de prueba
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS test_permissions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log(`✅ Puede crear tablas en ${dbName}`);
        
        // Insertar un registro de prueba
        await client.query(`INSERT INTO test_permissions (name) VALUES ('test') ON CONFLICT DO NOTHING`);
        console.log(`✅ Puede insertar datos en ${dbName}`);
        
        // Leer el registro
        const result = await client.query('SELECT COUNT(*) as count FROM test_permissions');
        console.log(`✅ Puede leer datos en ${dbName} (${result.rows[0].count} registros)`);
        
        // Limpiar
        await client.query('DROP TABLE test_permissions');
        console.log(`✅ Puede eliminar tablas en ${dbName}`);
        
        console.log(`🎉 ¡Base de datos encontrada: ${dbName}!`);
        
        await client.end();
        return dbName;
        
      } catch (err) {
        console.log(`❌ No puede crear tablas en ${dbName}: ${err.message}`);
      }
      
      await client.end();
      
    } catch (err) {
      console.log(`❌ No puede conectar a ${dbName}: ${err.message}`);
    }
  }
  
  console.log('\n❌ No se encontró ninguna base de datos con permisos de escritura');
  return null;
}

findCorrectDatabase()
  .then(dbName => {
    if (dbName) {
      console.log(`\n🎯 Usar esta configuración:`);
      console.log(`   database: '${dbName}'`);
    }
  })
  .catch(console.error);
