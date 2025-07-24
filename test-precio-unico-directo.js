const { pool } = require('./src/config/db');

async function testPrecioUnicoDirecto() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Precio Único functionality directly...\n');

    // 1. Obtener información inicial de la variante 4
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
      GROUP BY v.id_variante, v.nombre
    `;
    
    const initialResult = await client.query(initialQuery);
    const variant = initialResult.rows[0];
    
    console.log('Estado inicial:');
    console.log(`- ID: ${variant.id_variante}`);
    console.log(`- Nombre: ${variant.nombre_variante}`);
    console.log(`- Precio único: ${variant.precio_unico}`);
    console.log(`- Precio mínimo: $${variant.precio_minimo}`);
    console.log(`- Precio máximo: $${variant.precio_maximo}`);
    console.log(`- Tallas:`, variant.tallas_stock.map(t => `${t.nombre_talla}: $${t.precio}`));
    console.log();

    // 2. Simular actualización con precio único
    console.log('2. Aplicando precio único de $650 a todas las tallas...');
    
    await client.query('BEGIN');
    
    // Actualizar todos los precios de la variante 4 a $650
    const updatePriceQuery = `
      UPDATE stock 
      SET precio = $1
      WHERE id_variante = $2;
    `;
    
    const updateResult = await client.query(updatePriceQuery, [650.00, 4]);
    console.log(`Filas actualizadas: ${updateResult.rowCount}`);
    
    await client.query('COMMIT');
    console.log();

    // 3. Verificar el resultado
    console.log('3. Verificando estado después de la actualización...');
    const verifyResult = await client.query(initialQuery);
    const updatedVariant = verifyResult.rows[0];
    
    console.log('Estado después de actualización:');
    console.log(`- Precio único: ${updatedVariant.precio_unico}`);
    console.log(`- Precio mínimo: $${updatedVariant.precio_minimo}`);
    console.log(`- Precio máximo: $${updatedVariant.precio_maximo}`);
    console.log(`- Tallas:`, updatedVariant.tallas_stock.map(t => `${t.nombre_talla}: $${t.precio}`));
    
    // Verificar que todos los precios son iguales
    const precios = updatedVariant.tallas_stock.map(t => parseFloat(t.precio));
    const preciosUnicos = [...new Set(precios)];
    
    if (preciosUnicos.length === 1 && preciosUnicos[0] === 650) {
      console.log('✅ SUCCESS: Precio único aplicado correctamente!');
    } else {
      console.log('❌ ERROR: El precio único no se aplicó correctamente');
      console.log('Precios únicos encontrados:', preciosUnicos);
    }
    console.log();

    // 4. Probar aplicación de precio diferente
    console.log('4. Aplicando nuevo precio único de $750...');
    
    await client.query('BEGIN');
    const updateResult2 = await client.query(updatePriceQuery, [750.00, 4]);
    console.log(`Filas actualizadas: ${updateResult2.rowCount}`);
    await client.query('COMMIT');
    
    // Verificar
    const finalResult = await client.query(initialQuery);
    const finalVariant = finalResult.rows[0];
    
    console.log('Estado final:');
    console.log(`- Precio único: ${finalVariant.precio_unico}`);
    console.log(`- Precio mínimo: $${finalVariant.precio_minimo}`);
    console.log(`- Precio máximo: $${finalVariant.precio_maximo}`);
    console.log(`- Tallas:`, finalVariant.tallas_stock.map(t => `${t.nombre_talla}: $${t.precio}`));
    
    const preciosFinales = finalVariant.tallas_stock.map(t => parseFloat(t.precio));
    const preciosUnicosFinales = [...new Set(preciosFinales)];
    
    if (preciosUnicosFinales.length === 1 && preciosUnicosFinales[0] === 750) {
      console.log('✅ SUCCESS: Segunda actualización también funcionó correctamente!');
    } else {
      console.log('❌ ERROR: La segunda actualización no funcionó');
      console.log('Precios únicos encontrados:', preciosUnicosFinales);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la prueba:', error);
  } finally {
    client.release();
  }
}

// Ejecutar prueba
testPrecioUnicoDirecto().then(() => {
  console.log('\n🎉 Prueba completada!');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
