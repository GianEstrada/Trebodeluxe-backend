const { pool } = require('./src/config/db');

async function verificarEstadoVariante4() {
  try {
    console.log('🔍 Verificando estado actual de la variante 4...\n');

    const query = `
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        v.activo,
        p.id_producto,
        p.nombre as nombre_producto,
        p.categoria,
        p.marca,
        MIN(s.precio) as precio_minimo,
        MAX(s.precio) as precio_maximo,
        COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
        CASE 
          WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
          ELSE false
        END as precio_unico,
        json_agg(
          json_build_object(
            'id_talla', t.id_talla,
            'nombre_talla', t.nombre_talla,
            'cantidad', s.cantidad,
            'precio', s.precio
          ) ORDER BY t.orden
        ) as tallas_stock
      FROM variantes v
      JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN stock s ON s.id_variante = v.id_variante
      LEFT JOIN tallas t ON s.id_talla = t.id_talla
      WHERE v.id_variante = 4
      GROUP BY v.id_variante, v.nombre, v.activo, p.id_producto, p.nombre, p.categoria, p.marca
    `;

    const result = await pool.query(query);
    const variant = result.rows[0];

    if (!variant) {
      console.log('❌ Variante 4 no encontrada');
      return;
    }

    console.log('📊 Estado actual de la variante 4:');
    console.log(`- ID Variante: ${variant.id_variante}`);
    console.log(`- Nombre: ${variant.nombre_variante}`);
    console.log(`- Producto: ${variant.nombre_producto} (ID: ${variant.id_producto})`);
    console.log(`- Precio único: ${variant.precio_unico}`);
    console.log(`- Precio mínimo: $${variant.precio_minimo}`);
    console.log(`- Precio máximo: $${variant.precio_maximo}`);
    console.log(`- Precios distintos: ${variant.precios_distintos}`);
    console.log('- Tallas y precios:');
    
    variant.tallas_stock.forEach(talla => {
      console.log(`  * ${talla.nombre_talla}: Cantidad=${talla.cantidad}, Precio=$${talla.precio}`);
    });

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

verificarEstadoVariante4();
