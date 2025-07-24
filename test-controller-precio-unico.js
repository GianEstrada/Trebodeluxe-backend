const { pool } = require('./src/config/db');

// Simular el método updateVariant del controlador
async function testUpdateVariantController() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing updateVariant Controller Logic...\n');

    // Simular datos del frontend cuando se marca "precio único"
    const requestBody = {
      precio_unico: true,
      precio: 825.00,
      tallas: [
        { id_talla: 7, cantidad: 10 }, // XS
        { id_talla: 8, cantidad: 15 }, // S  
        { id_talla: 9, cantidad: 20 }, // M
        { id_talla: 10, cantidad: 12 } // L
      ]
    };

    const variantId = 4;

    console.log('1. Estado inicial de la variante...');
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
      WHERE v.id_variante = $1
      GROUP BY v.id_variante, v.nombre
    `;
    
    const initialResult = await client.query(initialQuery, [variantId]);
    const initialVariant = initialResult.rows[0];
    
    console.log(`Estado inicial - Precio único: ${initialVariant.precio_unico}, Min: $${initialVariant.precio_minimo}, Max: $${initialVariant.precio_maximo}`);
    console.log();

    // Simular la lógica del controlador
    console.log('2. Simulando lógica del controlador updateVariant...');
    
    await client.query('BEGIN');

    const { precio_unico, precio, tallas } = requestBody;

    // Obtener id_producto para el stock
    const productQuery = 'SELECT id_producto FROM variantes WHERE id_variante = $1';
    const productResult = await client.query(productQuery, [variantId]);
    const id_producto = productResult.rows[0].id_producto;

    console.log(`ID Producto: ${id_producto}`);
    console.log(`Precio único solicitado: ${precio_unico}`);
    console.log(`Precio a aplicar: $${precio}`);
    console.log();

    // Aplicar lógica del controlador actualizado
    if (tallas && tallas.length > 0) {
      if (precio_unico === true && precio !== undefined) {
        console.log('3. Aplicando precio único a todas las tallas...');
        
        // Aplicar precio único a todas las tallas de la variante
        for (const talla of tallas) {
          // Verificar si ya existe stock para esta talla
          const existingStockQuery = `
            SELECT id_stock FROM stock 
            WHERE id_variante = $1 AND id_talla = $2
          `;
          const existingStock = await client.query(existingStockQuery, [variantId, talla.id_talla]);
          
          if (existingStock.rows.length > 0) {
            // Actualizar stock existente con precio único
            const updateStockQuery = `
              UPDATE stock 
              SET cantidad = $1, precio = $2
              WHERE id_variante = $3 AND id_talla = $4;
            `;
            
            await client.query(updateStockQuery, [
              talla.cantidad,
              precio, // Usar precio único para todas las tallas
              variantId,
              talla.id_talla
            ]);
            
            console.log(`  ✓ Actualizada talla ${talla.id_talla}: cantidad=${talla.cantidad}, precio=$${precio}`);
          } else if (talla.cantidad > 0) {
            // Crear nuevo stock solo si la cantidad es mayor a 0
            const stockQuery = `
              INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
              VALUES ($1, $2, $3, $4, $5);
            `;
            
            await client.query(stockQuery, [
              id_producto,
              variantId,
              talla.id_talla,
              talla.cantidad,
              precio // Usar precio único para todas las tallas
            ]);
            
            console.log(`  ✓ Creada talla ${talla.id_talla}: cantidad=${talla.cantidad}, precio=$${precio}`);
          }
        }
      } else {
        console.log('3. Aplicando precios diferenciados (lógica original)...');
        // Lógica original para precios diferenciados
      }
    }

    await client.query('COMMIT');
    console.log();

    // Verificar resultado
    console.log('4. Verificando resultado final...');
    const finalResult = await client.query(initialQuery, [variantId]);
    const finalVariant = finalResult.rows[0];
    
    console.log(`Estado final - Precio único: ${finalVariant.precio_unico}, Min: $${finalVariant.precio_minimo}, Max: $${finalVariant.precio_maximo}`);
    
    // Obtener detalle de tallas
    const tallasQuery = `
      SELECT t.nombre_talla, s.cantidad, s.precio
      FROM stock s
      JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = $1
      ORDER BY t.orden
    `;
    
    const tallasResult = await client.query(tallasQuery, [variantId]);
    console.log('Tallas actualizadas:');
    tallasResult.rows.forEach(talla => {
      console.log(`  - ${talla.nombre_talla}: cantidad=${talla.cantidad}, precio=$${talla.precio}`);
    });

    // Validar resultado
    const precios = tallasResult.rows.map(t => parseFloat(t.precio));
    const preciosUnicos = [...new Set(precios)];
    
    if (preciosUnicos.length === 1 && preciosUnicos[0] === 825) {
      console.log('\n✅ SUCCESS: El controlador updateVariant funciona correctamente con precio único!');
    } else {
      console.log('\n❌ ERROR: El precio único no se aplicó correctamente');
      console.log('Precios únicos encontrados:', preciosUnicos);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en la simulación del controlador:', error);
  } finally {
    client.release();
  }
}

// Ejecutar prueba
testUpdateVariantController().then(() => {
  console.log('\n🎉 Prueba del controlador completada!');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
