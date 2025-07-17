// Script de prueba para conectar a PostgreSQL con trebolux_db
const PostgresDatabase = require('./postgres-database');

async function testConnection() {
  console.log('🔌 Probando conexión a PostgreSQL con trebolux_db...\n');
  
  const db = new PostgresDatabase();
  
  try {
    // Intentar conectar
    console.log('1️⃣ Conectando a la base de datos...');
    const connected = await db.connect();
    
    if (connected) {
      console.log('✅ Conexión exitosa a trebolux_db');
      
      // Probar una consulta simple
      console.log('\n2️⃣ Probando consulta simple...');
      const result = await db.query('SELECT current_database(), current_user, version()');
      console.log('📊 Base de datos actual:', result.rows[0].current_database);
      console.log('👤 Usuario actual:', result.rows[0].current_user);
      console.log('🐘 Versión PostgreSQL:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
      
      // Verificar tablas creadas
      console.log('\n3️⃣ Verificando tablas creadas...');
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      if (tables.rows.length > 0) {
        console.log('📋 Tablas encontradas:');
        tables.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
      } else {
        console.log('❌ No se encontraron tablas');
      }
      
      // Verificar usuario admin
      console.log('\n4️⃣ Verificando usuario admin...');
      const admin = await db.getUserByEmail('admin@treboluxe.com');
      if (admin) {
        console.log('✅ Usuario admin encontrado:');
        console.log(`   - ID: ${admin.id}`);
        console.log(`   - Nombre: ${admin.first_name} ${admin.last_name}`);
        console.log(`   - Email: ${admin.email}`);
        console.log(`   - Rol: ${admin.role}`);
      } else {
        console.log('❌ Usuario admin no encontrado');
      }
      
      // Verificar sistemas de tallas
      console.log('\n5️⃣ Verificando sistemas de tallas...');
      const sizeSystems = await db.getSizeSystems();
      if (sizeSystems.length > 0) {
        console.log('✅ Sistemas de tallas encontrados:');
        sizeSystems.forEach(system => {
          console.log(`   - ${system.name}: ${system.sizes.join(', ')}`);
        });
      } else {
        console.log('❌ No se encontraron sistemas de tallas');
      }
      
      console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
      
    } else {
      console.log('❌ No se pudo conectar a la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    if (error.code) {
      console.error('🔍 Código de error:', error.code);
    }
  } finally {
    // Desconectar
    await db.disconnect();
    console.log('\n👋 Desconectado de la base de datos');
  }
}

// Ejecutar las pruebas
testConnection();
