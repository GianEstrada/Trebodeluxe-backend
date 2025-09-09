const db = require('./src/config/db');

(async () => {
  try {
    console.log('🔍 Verificando estructura de las tablas ordenes y pedido_detalle...');
    
    // Verificar estructura de la tabla ordenes
    const ordenesResult = await db.pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'ordenes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estructura de la tabla ordenes:');
    ordenesResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    // Verificar estructura de la tabla pedido_detalle
    const pedidoDetalleResult = await db.pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'pedido_detalle' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estructura de la tabla pedido_detalle:');
    pedidoDetalleResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    // Verificar si existe alguna columna relacionada con total/subtotal
    const totalColumns = await db.pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('ordenes', 'pedido_detalle')
      AND (column_name LIKE '%total%' OR column_name LIKE '%precio%')
      ORDER BY table_name, column_name;
    `);
    
    console.log('\n� Columnas relacionadas con precios/totales:');
    if (totalColumns.rows.length > 0) {
      totalColumns.rows.forEach(row => {
        console.log(`- ${row.table_name}.${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('- No se encontraron columnas de precio/total');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
