const { pool } = require('./src/config/db');

async function testPreciosDiferenciados() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Precios Diferenciados...\n');

    // 1. Estado inicial
    console.log('1. Estado inicial de la variante 4...');
    const initialQuery = `
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        MIN(s.precio) as precio_minimo,
        MAX(s.precio) as precio_maximo,
        COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
        CASE 
          WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
          ELSE false
        END as precio_unico
      FROM variantes v
      LEFT JOIN stock s ON s.id_variante = v.id_variante
      WHERE v.id_variante = 4
      GROUP BY v.id_variante, v.nombre
    `;
    
    const initialResult = await client.query(initialQuery);
    const variant = initialResult.rows[0];
    
    console.log(`Estado inicial - Precio único: ${variant.precio_unico}, Min: $${variant.precio_minimo}, Max: $${variant.precio_maximo}`);

    // 2. Aplicar precios diferenciados manualmente para simular frontend
    console.log('\n2. Aplicando precios diferenciados...');
    
    await client.query('BEGIN');
    
    // Actualizar con precios diferentes por talla
    const updates = [
      { id_talla: 7, precio: 800.00, cantidad: 10 }, // XS
      { id_talla: 8, precio: 825.00, cantidad: 15 }, // S
      { id_talla: 9, precio: 850.00, cantidad: 20 }, // M
      { id_talla: 10, precio: 875.00, cantidad: 12 } // L
    ];
    
    for (const update of updates) {
      const updateQuery = `
        UPDATE stock 
        SET precio = $1, cantidad = $2
        WHERE id_variante = 4 AND id_talla = $3;
      `;
      
      await client.query(updateQuery, [update.precio, update.cantidad, update.id_talla]);
      console.log(`  ✅ Talla ${update.id_talla}: $${update.precio} (cantidad: ${update.cantidad})`);
    }
    
    await client.query('COMMIT');

    // 3. Verificar resultado
    console.log('\n3. Verificando resultado...');
    const finalResult = await client.query(initialQuery);
    const finalVariant = finalResult.rows[0];
    
    console.log(`Estado final - Precio único: ${finalVariant.precio_unico}, Min: $${finalVariant.precio_minimo}, Max: $${finalVariant.precio_maximo}`);
    
    // Mostrar detalles
    const detailQuery = `
      SELECT t.nombre_talla, s.cantidad, s.precio
      FROM stock s
      JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = 4
      ORDER BY t.orden
    `;
    
    const detailResult = await client.query(detailQuery);
    console.log('Precios por talla:');
    detailResult.rows.forEach(talla => {
      console.log(`  - ${talla.nombre_talla}: $${talla.precio} (stock: ${talla.cantidad})`);
    });

    if (finalVariant.precio_unico === false && finalVariant.precios_distintos > 1) {
      console.log('\n✅ SUCCESS: Precios diferenciados aplicados correctamente!');
    } else {
      console.log('\n❌ ERROR: Los precios no se diferenciaron correctamente');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testPreciosDiferenciados();
