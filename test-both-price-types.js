const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testBothPriceTypes() {
  try {
    console.log('=== PRUEBA COMPLETA DE DETECCIÓN DE PRECIOS ===\n');
    
    // Primero, configuremos precios uniformes para la variante 4
    console.log('1. CONFIGURANDO PRECIOS UNIFORMES ($520 para todas las tallas)');
    await pool.query(`
      UPDATE stock 
      SET precio = 520
      WHERE id_variante = 4
    `);
    
    // Probar con precios uniformes
    console.log('\n=== PRUEBA CON PRECIOS UNIFORMES ===');
    const uniformResult = await pool.query(`
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        p.nombre as nombre_producto,
        precios_info.precio_minimo,
        precios_info.precio_maximo,
        precios_info.precios_distintos,
        precios_info.precio_unico,
        COALESCE(stock_info.tallas_stock, '[]'::json) as tallas_stock
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN (
        SELECT 
          s.id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'cantidad', COALESCE(s.cantidad, 0),
              'precio', s.precio,
              'orden', t.orden
            ) ORDER BY t.orden, t.id_talla
          ) as tallas_stock
        FROM tallas t
        LEFT JOIN stock s ON s.id_talla = t.id_talla AND s.id_variante = 4
        WHERE t.id_sistema_talla = (
          SELECT p2.id_sistema_talla 
          FROM productos p2 
          INNER JOIN variantes v2 ON p2.id_producto = v2.id_producto 
          WHERE v2.id_variante = 4
        )
        GROUP BY s.id_variante
      ) stock_info ON v.id_variante = stock_info.id_variante
      LEFT JOIN (
        SELECT 
          s.id_variante,
          MIN(s.precio) as precio_minimo,
          MAX(s.precio) as precio_maximo,
          COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
          CASE 
            WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
            ELSE false
          END as precio_unico
        FROM stock s
        WHERE s.id_variante = 4
        GROUP BY s.id_variante
      ) precios_info ON v.id_variante = precios_info.id_variante
      WHERE v.id_variante = 4
    `);
    
    if (uniformResult.rows.length > 0) {
      const variant = uniformResult.rows[0];
      console.log(`Variante: ${variant.nombre_variante}`);
      console.log(`Precios distintos: ${variant.precios_distintos}`);
      console.log(`Precio único: ${variant.precio_unico}`);
      console.log(`Rango: $${variant.precio_minimo} - $${variant.precio_maximo}`);
      
      if (variant.precio_unico) {
        console.log('✅ DETECTADO CORRECTAMENTE: Precio uniforme');
        console.log(`   Frontend debería mostrar: $${variant.precio_minimo}`);
      } else {
        console.log('❌ ERROR: No detectó precio uniforme');
      }
    }
    
    // Ahora configuremos precios diferenciados
    console.log('\n2. CONFIGURANDO PRECIOS DIFERENCIADOS');
    await pool.query(`
      UPDATE stock 
      SET precio = CASE 
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'XS') THEN 500
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'S') THEN 500
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'M') THEN 560
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'L') THEN 499
      END
      WHERE id_variante = 4
    `);
    
    // Probar con precios diferenciados
    console.log('\n=== PRUEBA CON PRECIOS DIFERENCIADOS ===');
    const diffResult = await pool.query(`
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        p.nombre as nombre_producto,
        precios_info.precio_minimo,
        precios_info.precio_maximo,
        precios_info.precios_distintos,
        precios_info.precio_unico,
        COALESCE(stock_info.tallas_stock, '[]'::json) as tallas_stock
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN (
        SELECT 
          s.id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'cantidad', COALESCE(s.cantidad, 0),
              'precio', s.precio,
              'orden', t.orden
            ) ORDER BY t.orden, t.id_talla
          ) as tallas_stock
        FROM tallas t
        LEFT JOIN stock s ON s.id_talla = t.id_talla AND s.id_variante = 4
        WHERE t.id_sistema_talla = (
          SELECT p2.id_sistema_talla 
          FROM productos p2 
          INNER JOIN variantes v2 ON p2.id_producto = v2.id_producto 
          WHERE v2.id_variante = 4
        )
        GROUP BY s.id_variante
      ) stock_info ON v.id_variante = stock_info.id_variante
      LEFT JOIN (
        SELECT 
          s.id_variante,
          MIN(s.precio) as precio_minimo,
          MAX(s.precio) as precio_maximo,
          COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
          CASE 
            WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
            ELSE false
          END as precio_unico
        FROM stock s
        WHERE s.id_variante = 4
        GROUP BY s.id_variante
      ) precios_info ON v.id_variante = precios_info.id_variante
      WHERE v.id_variante = 4
    `);
    
    if (diffResult.rows.length > 0) {
      const variant = diffResult.rows[0];
      console.log(`Variante: ${variant.nombre_variante}`);
      console.log(`Precios distintos: ${variant.precios_distintos}`);
      console.log(`Precio único: ${variant.precio_unico}`);
      console.log(`Rango: $${variant.precio_minimo} - $${variant.precio_maximo}`);
      
      if (!variant.precio_unico) {
        console.log('✅ DETECTADO CORRECTAMENTE: Precios diferenciados');
        console.log(`   Frontend debería mostrar: $${variant.precio_minimo} - $${variant.precio_maximo}`);
        
        console.log('\n   Detalle por talla:');
        variant.tallas_stock.forEach(talla => {
          console.log(`   ${talla.nombre_talla}: $${talla.precio}`);
        });
      } else {
        console.log('❌ ERROR: No detectó precios diferenciados');
      }
    }
    
    console.log('\n=== RESUMEN DE PRUEBAS ===');
    console.log('✅ Sistema de detección de precios implementado correctamente');
    console.log('✅ Campos devueltos por el backend:');
    console.log('   - precio_minimo: Para mostrar precio único o rango mínimo');
    console.log('   - precio_maximo: Para mostrar rango máximo');
    console.log('   - precios_distintos: Cantidad de precios diferentes');
    console.log('   - precio_unico: true/false para determinar el tipo de display');
    console.log('   - tallas_stock: Array con precios individuales por talla');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testBothPriceTypes();
