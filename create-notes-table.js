const { pool } = require('./src/config/db');
const fs = require('fs');

async function createNotesTable() {
  console.log('🔧 Creando tabla notas_generales...');
  
  try {
    const sql = fs.readFileSync('./create-notas-table.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Tabla notas_generales creada exitosamente');
    
    // Verificar que se creó correctamente
    const checkResult = await pool.query('SELECT COUNT(*) FROM notas_generales');
    console.log('📊 Notas en la tabla:', checkResult.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error creando tabla:', error);
  }
}

createNotesTable();
