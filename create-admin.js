// Script para actualizar usuario a admin
const db = require('./src/config/db');

async function makeUserAdmin() {
  try {
    console.log('🔧 Actualizando usuario a admin...');
    
    // Actualizar rol a admin (string "admin")
    const result = await db.query(
      'UPDATE usuarios SET rol = $1 WHERE usuario = $2 RETURNING *',
      ['admin', 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Usuario actualizado a admin correctamente');
      console.log('Usuario admin:', result.rows[0]);
    } else {
      console.log('❌ No se encontró el usuario admin');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeUserAdmin();
