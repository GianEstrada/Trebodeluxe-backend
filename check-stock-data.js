const { pool } = require('./src/config/db');

async function checkStockData() {
  try {
    console.log('🔍 Verificando datos en la tabla stock...\n');
    
    // Verificar estructura de la tabla stock
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'stock' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estructura de la tabla stock:');
    tableStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar datos en la tabla stock
    console.log('\n📊 Datos en la tabla stock:');
    const stockData = await pool.query(`
      SELECT s.*, v.nombre as variante_nombre, t.nombre_talla 
      FROM stock s
      JOIN variantes v ON s.id_variante = v.id_variante
      JOIN tallas t ON s.id_talla = t.id_talla
      LIMIT 10;
    `);
    
    if (stockData.rows.length > 0) {
      stockData.rows.forEach(row => {
        console.log(`   - Variante: ${row.variante_nombre}, Talla: ${row.nombre_talla}, Cantidad: ${row.cantidad}, Precio: ${row.precio || 'NULL'}`);
      });
    } else {
      console.log('   ❌ No hay datos en la tabla stock');
    }
    
    // Verificar si la variante 4 tiene datos de stock
    console.log('\n🎯 Datos específicos de la variante 4:');
    const variant4Stock = await pool.query(`
      SELECT s.*, t.nombre_talla 
      FROM stock s
      JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = 4;
    `);
    
    if (variant4Stock.rows.length > 0) {
      variant4Stock.rows.forEach(row => {
        console.log(`   - Talla: ${row.nombre_talla}, Cantidad: ${row.cantidad}, Precio: ${row.precio || 'NULL'}`);
      });
    } else {
      console.log('   ❌ No hay datos de stock para la variante 4');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkStockData();
