const { Client } = require('pg');

async function exploreDatabase() {
  console.log('🔍 Explorando base de datos PostgreSQL...\n');

  const client = new Client({
    host: 'dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com',
    port: 5432,
    user: 'trebolux_usr',
    password: 'nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // Listar todas las bases de datos
    console.log('📂 Bases de datos disponibles:');
    try {
      const result = await client.query(`
        SELECT datname, datowner, pg_catalog.pg_get_userbyid(datowner) as owner
        FROM pg_database 
        WHERE datistemplate = false
        ORDER BY datname
      `);
      
      result.rows.forEach(row => {
        console.log(`   - ${row.datname} (owner: ${row.owner})`);
      });
    } catch (err) {
      console.log(`❌ Error listando bases de datos: ${err.message}`);
    }

    // Listar esquemas en la base de datos actual
    console.log('\n📁 Esquemas en la base de datos actual:');
    try {
      const result = await client.query(`
        SELECT schema_name, schema_owner
        FROM information_schema.schemata
        ORDER BY schema_name
      `);
      
      result.rows.forEach(row => {
        console.log(`   - ${row.schema_name} (owner: ${row.schema_owner})`);
      });
    } catch (err) {
      console.log(`❌ Error listando esquemas: ${err.message}`);
    }

    // Verificar permisos del usuario actual
    console.log('\n👤 Información del usuario actual:');
    try {
      const result = await client.query(`
        SELECT 
          current_user as usuario_actual,
          session_user as usuario_sesion,
          current_database() as base_datos_actual
      `);
      
      console.log(`   Usuario actual: ${result.rows[0].usuario_actual}`);
      console.log(`   Usuario de sesión: ${result.rows[0].usuario_sesion}`);
      console.log(`   Base de datos actual: ${result.rows[0].base_datos_actual}`);
    } catch (err) {
      console.log(`❌ Error obteniendo info del usuario: ${err.message}`);
    }

    // Verificar permisos en el esquema public
    console.log('\n🔐 Permisos en esquema public:');
    try {
      const result = await client.query(`
        SELECT 
          grantee,
          privilege_type,
          is_grantable
        FROM information_schema.schema_privileges 
        WHERE schema_name = 'public' AND grantee = current_user
      `);
      
      if (result.rows.length > 0) {
        result.rows.forEach(row => {
          console.log(`   ${row.privilege_type}: ${row.is_grantable === 'YES' ? 'Sí' : 'No'}`);
        });
      } else {
        console.log('   Sin permisos específicos en el esquema public');
      }
    } catch (err) {
      console.log(`❌ Error verificando permisos: ${err.message}`);
    }

    // Probar crear un esquema propio
    console.log('\n🛠️  Probando crear esquema propio:');
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS treboluxe');
      console.log('   ✅ Esquema "treboluxe" creado exitosamente');
      
      // Probar crear tabla en el nuevo esquema
      await client.query(`
        CREATE TABLE IF NOT EXISTS treboluxe.users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('   ✅ Tabla de prueba creada en esquema "treboluxe"');
      
    } catch (err) {
      console.log(`   ❌ Error creando esquema propio: ${err.message}`);
    }

    await client.end();
    console.log('\n🔌 Conexión cerrada');

  } catch (err) {
    console.log(`❌ Error de conexión: ${err.message}`);
  }
}

exploreDatabase().catch(console.error);
