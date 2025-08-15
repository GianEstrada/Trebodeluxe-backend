// check-users-simple.js
require('dotenv').config();
const { Pool } = require('pg');

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Verificando usuarios en la base de datos...');
    
    // Obtener todos los usuarios
    const result = await pool.query(
      'SELECT id_usuario, nombres, apellidos, correo, usuario, rol, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );

    console.log(`📊 Total usuarios encontrados: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n👥 Lista de usuarios:');
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nombres} ${user.apellidos} (${user.usuario})`);
        console.log(`   Email: ${user.correo}`);
        console.log(`   Rol: ${user.rol}`);
        console.log(`   Creado: ${user.fecha_creacion}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
