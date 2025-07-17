const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Probando conexión a PostgreSQL...\n');

  // Configuraciones a probar
  const configs = [
    {
      name: 'trebolux_usr database',
      config: {
        host: 'dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com',
        port: 5432,
        user: 'trebolux_usr',
        password: 'nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR',
        database: 'trebolux_usr',
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'postgres default database',
      config: {
        host: 'dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com',
        port: 5432,
        user: 'trebolux_usr',
        password: 'nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'trebolux database',
      config: {
        host: 'dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com',
        port: 5432,
        user: 'trebolux_usr',
        password: 'nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR',
        database: 'trebolux',
        ssl: { rejectUnauthorized: false }
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n📊 Probando: ${name}`);
    const client = new Client(config);
    
    try {
      await client.connect();
      console.log(`✅ Conexión exitosa`);
      
      // Probar consulta básica
      try {
        const result = await client.query('SELECT version()');
        console.log(`📋 PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
      } catch (err) {
        console.log(`⚠️  Error en consulta: ${err.message}`);
      }
      
      // Verificar permisos
      try {
        const result = await client.query('SELECT current_database(), current_user, session_user');
        console.log(`📂 Base de datos: ${result.rows[0].current_database}`);
        console.log(`👤 Usuario: ${result.rows[0].current_user}`);
        console.log(`🔐 Sesión: ${result.rows[0].session_user}`);
      } catch (err) {
        console.log(`⚠️  Error obteniendo info: ${err.message}`);
      }
      
      // Listar esquemas disponibles
      try {
        const result = await client.query('SELECT schema_name FROM information_schema.schemata WHERE schema_owner = current_user ORDER BY schema_name');
        console.log(`📁 Esquemas disponibles: ${result.rows.map(r => r.schema_name).join(', ')}`);
      } catch (err) {
        console.log(`⚠️  Error listando esquemas: ${err.message}`);
      }
      
      // Probar creación de tabla
      try {
        await client.query('CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name VARCHAR(50))');
        console.log(`✅ Puede crear tablas`);
        await client.query('DROP TABLE test_table');
        console.log(`✅ Puede eliminar tablas`);
      } catch (err) {
        console.log(`❌ No puede crear tablas: ${err.message}`);
      }
      
      await client.end();
      console.log(`🔌 Conexión cerrada`);
      
    } catch (err) {
      console.log(`❌ Error de conexión: ${err.message}`);
    }
  }
}

testConnection().catch(console.error);
