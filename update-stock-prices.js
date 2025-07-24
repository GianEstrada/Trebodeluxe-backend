const { pool } = require('./src/config/db');

async function updateStockPrices() {
  try {
    console.log('🔧 Actualizando precios en la tabla stock para la variante 4...\n');
    
    // Actualizar precios para la variante 4
    const updateQueries = [
      { talla: 'XS', precio: 500 },
      { talla: 'S', precio: 500 },
      { talla: 'M', precio: 560 },
      { talla: 'L', precio: 499 },
      { talla: 'XL', precio: 550 }
    ];
    
    for (const item of updateQueries) {
      const result = await pool.query(`
        UPDATE stock 
        SET precio = $1 
        WHERE id_variante = 4 
        AND id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = $2)
      `, [item.precio, item.talla]);
      
      console.log(`✅ Actualizado precio de talla ${item.talla}: $${item.precio} (${result.rowCount} filas afectadas)`);
    }
    
    // Verificar los cambios
    console.log('\n🎯 Verificando datos actualizados de la variante 4:');
    const variant4Stock = await pool.query(`
      SELECT s.*, t.nombre_talla 
      FROM stock s
      JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = 4
      ORDER BY t.orden;
    `);
    
    if (variant4Stock.rows.length > 0) {
      variant4Stock.rows.forEach(row => {
        console.log(`   - Talla: ${row.nombre_talla}, Cantidad: ${row.cantidad}, Precio: $${row.precio || 'NULL'}`);
      });
      console.log('\n✅ ¡Precios actualizados correctamente!');
    } else {
      console.log('   ❌ No hay datos de stock para la variante 4');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateStockPrices();
