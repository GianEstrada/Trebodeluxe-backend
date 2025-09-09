// add-colonia-field.js
const db = require('./src/config/db');

async function addColoniaField() {
  try {
    // Agregar campo colonia a informacion_envio
    await db.pool.query(`
      ALTER TABLE informacion_envio 
      ADD COLUMN IF NOT EXISTS colonia VARCHAR(150)
    `);
    
    console.log('✅ Campo colonia agregado a informacion_envio');
    
    // Verificar estructura actualizada
    const result = await db.pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'informacion_envio'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura actualizada de informacion_envio:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addColoniaField();
