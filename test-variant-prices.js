const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testVariantPrices() {
  try {
    console.log('=== ANÁLISIS DE PRECIOS DE LA VARIANTE 4 ===\n');
    
    const result = await pool.query(`
      SELECT 
        v.id_variante,
        v.nombre as variant_name,
        COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
        MIN(s.precio) as precio_min,
        MAX(s.precio) as precio_max,
        CASE 
          WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN 'UNIFORME'
          ELSE 'DIFERENCIADO'
        END as tipo_precio
      FROM variantes v
      LEFT JOIN stock s ON v.id_variante = s.id_variante
      WHERE v.id_variante = 4
      GROUP BY v.id_variante, v.nombre
    `);
    
    console.log('Análisis de precios:');
    console.table(result.rows);
    
    const detailResult = await pool.query(`
      SELECT 
        t.nombre_talla, 
        s.precio, 
        s.cantidad,
        t.orden
      FROM stock s
      INNER JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = 4
      ORDER BY t.orden
    `);
    
    console.log('\nDetalle por talla:');
    console.table(detailResult.rows);
    
    // Ahora probemos con el endpoint getAllVariants
    console.log('\n=== PRUEBA CON getAllVariants ===\n');
    
    const variantsResult = await pool.query(`
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        v.activo,
        v.id_producto,
        p.nombre as nombre_producto,
        p.descripcion as descripcion_producto,
        p.categoria,
        p.marca,
        p.id_sistema_talla,
        st.nombre as sistema_talla,
        COALESCE(img.imagenes, '[]'::json) as imagenes,
        COALESCE(stock_info.tallas_stock, '[]'::json) as tallas_stock,
        precios_info.precio_minimo,
        precios_info.precio_maximo,
        precios_info.precios_distintos,
        precios_info.precio_unico
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN (
        SELECT 
          id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_imagen', id_imagen,
              'url', url,
              'public_id', public_id,
              'orden', orden
            ) ORDER BY orden
          ) as imagenes
        FROM imagenes_variante
        GROUP BY id_variante
      ) img ON v.id_variante = img.id_variante
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
        LEFT JOIN stock s ON s.id_talla = t.id_talla AND s.id_variante = v.id_variante
        WHERE t.id_sistema_talla = p.id_sistema_talla
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
        GROUP BY s.id_variante
      ) precios_info ON v.id_variante = precios_info.id_variante
      WHERE v.id_variante = 4 AND v.activo = true AND p.activo = true
      ORDER BY v.id_variante
    `);
    
    if (variantsResult.rows.length > 0) {
      const variant = variantsResult.rows[0];
      console.log('Información de la variante:', {
        id_variante: variant.id_variante,
        nombre_variante: variant.nombre_variante,
        precio_minimo: variant.precio_minimo,
        precio_maximo: variant.precio_maximo,
        precios_distintos: variant.precios_distintos,
        precio_unico: variant.precio_unico
      });
      
      console.log('\nTallas y stock:');
      console.log(JSON.stringify(variant.tallas_stock, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testVariantPrices();
