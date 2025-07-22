// Script para verificar estructura de usuarios
const db = require('./src/config/db');

async function checkUsersTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla usuarios...');
    
    // Ver columnas
    const columns = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Columnas de la tabla usuarios:');
    console.log(JSON.stringify(columns.rows, null, 2));
    
    // Ver constraints
    const constraints = await db.query(`
      SELECT constraint_name, constraint_type, check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'usuarios' AND tc.constraint_type = 'CHECK';
    `);
    
    console.log('\nConstraints de CHECK:');
    console.log(JSON.stringify(constraints.rows, null, 2));
    
    // Ver valores únicos de rol
    const roles = await db.query('SELECT DISTINCT rol FROM usuarios;');
    
    console.log('\nRoles existentes:');
    console.log(JSON.stringify(roles.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsersTable();
