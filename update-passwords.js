// update-passwords.js
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function updatePasswords() {
  console.log('🔐 Actualizando contraseñas con bcrypt...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    
    // Hash de la contraseña admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Actualizar usuarios admin
    const updateResult = await client.query(`
      UPDATE usuarios 
      SET contrasena = $1 
      WHERE rol = 'admin'
    `, [hashedPassword]);
    
    console.log(`✅ ${updateResult.rowCount} contraseñas de admin actualizadas`);
    
    // Verificar usuarios actualizados
    const users = await client.query(`
      SELECT id_usuario, nombres, apellidos, correo, usuario, rol 
      FROM usuarios 
      WHERE rol = 'admin'
    `);
    
    console.log('👤 Usuarios admin en la base de datos:');
    users.rows.forEach(user => {
      console.log(`  - ${user.nombres} ${user.apellidos} (${user.usuario}) - ${user.correo}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('🎉 Contraseñas actualizadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error actualizando contraseñas:', error);
  }
}

updatePasswords();
