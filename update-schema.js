// update-schema.js - Script para actualizar el esquema de la base de datos

require('dotenv').config();
const db = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function updateSchema() {
  try {
    console.log('📁 Leyendo esquema de base de datos...');
    const schemaPath = path.join(__dirname, 'src', 'config', 'complete_schema_with_promotions.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('💾 Ejecutando esquema en la base de datos...');
    await db.query(schema);
    
    console.log('✅ Esquema actualizado exitosamente');
    console.log('🔍 Verificando tablas creadas...');
    
    // Verificar que las tablas se crearon correctamente
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const result = await db.query(tablesQuery);
    console.log('\n📋 Tablas disponibles:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Verificar datos de prueba
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM productos) as productos,
        (SELECT COUNT(*) FROM variantes) as variantes,
        (SELECT COUNT(*) FROM promociones) as promociones,
        (SELECT COUNT(*) FROM sistemas_talla) as sistemas_talla,
        (SELECT COUNT(*) FROM tallas) as tallas,
        (SELECT COUNT(*) FROM stock) as stock
    `;
    
    const counts = await db.query(countQuery);
    const data = counts.rows[0];
    
    console.log('\n📊 Datos insertados:');
    console.log(`  - Productos: ${data.productos}`);
    console.log(`  - Variantes: ${data.variantes}`);
    console.log(`  - Promociones: ${data.promociones}`);
    console.log(`  - Sistemas de talla: ${data.sistemas_talla}`);
    console.log(`  - Tallas: ${data.tallas}`);
    console.log(`  - Stock: ${data.stock}`);
    
    console.log('\n🎉 ¡Base de datos actualizada y populada exitosamente!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error actualizando esquema:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

updateSchema();
