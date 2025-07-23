const { pool } = require('./src/config/db');

async function verifyProduct() {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_producto,
        p.nombre as producto,
        v.nombre as variante,
        iv.url as imagen_url,
        iv.public_id,
        iv.orden
      FROM productos p
      JOIN variantes v ON p.id_producto = v.id_producto
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
      WHERE p.nombre = 'Producto de Prueba'
      ORDER BY p.id_producto, v.id_variante, iv.orden;
    `);
    
    console.log('🔍 Producto creado:');
    result.rows.forEach(row => {
      console.log(`  Producto: ${row.producto}`);
      console.log(`  Variante: ${row.variante}`);
      console.log(`  Imagen URL: ${row.imagen_url}`);
      console.log(`  Public ID: ${row.public_id}`);
      console.log(`  Orden: ${row.orden}`);
      console.log('  ---');
    });
    
    if (result.rows.length > 0) {
      console.log('✅ ¡Las imágenes se guardaron correctamente en la base de datos!');
    } else {
      console.log('❌ No se encontró el producto o las imágenes');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyProduct();
