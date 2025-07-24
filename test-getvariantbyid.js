const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testGetVariantById() {
  try {
    console.log('=== PROBANDO getVariantById QUERY ===\n');
    
    const id = 4;
    const query = `
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
        WHERE id_variante = $1
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
        LEFT JOIN stock s ON s.id_talla = t.id_talla AND s.id_variante = $1
        WHERE t.id_sistema_talla = (
          SELECT p2.id_sistema_talla 
          FROM productos p2 
          INNER JOIN variantes v2 ON p2.id_producto = v2.id_producto 
          WHERE v2.id_variante = $1
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
        WHERE s.id_variante = $1
        GROUP BY s.id_variante
      ) precios_info ON v.id_variante = precios_info.id_variante
      WHERE v.id_variante = $1 AND v.activo = true AND p.activo = true
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length > 0) {
      const variant = result.rows[0];
      
      console.log('=== INFORMACIÓN DE LA VARIANTE 4 (getVariantById) ===');
      console.log('ID Variante:', variant.id_variante);
      console.log('Nombre:', variant.nombre_variante);
      console.log('Producto:', variant.nombre_producto);
      console.log('Sistema Talla:', variant.sistema_talla);
      console.log('Precio Mínimo:', variant.precio_minimo);
      console.log('Precio Máximo:', variant.precio_maximo);
      console.log('Precios Distintos:', variant.precios_distintos);
      console.log('Precio Único:', variant.precio_unico);
      
      console.log('\n=== TALLAS Y STOCK ===');
      const tallasStock = variant.tallas_stock;
      if (Array.isArray(tallasStock)) {
        tallasStock.forEach(talla => {
          console.log(`${talla.nombre_talla}: Cantidad ${talla.cantidad}, Precio $${talla.precio || 'Sin precio'}`);
        });
      } else {
        console.log('No hay información de tallas y stock');
      }
      
      console.log('\n=== RESULTADO PARA EL FRONTEND ===');
      console.log('```json');
      console.log(JSON.stringify({
        success: true,
        variant: {
          id_variante: variant.id_variante,
          nombre_variante: variant.nombre_variante,
          nombre_producto: variant.nombre_producto,
          precio_minimo: variant.precio_minimo,
          precio_maximo: variant.precio_maximo,
          precios_distintos: variant.precios_distintos,
          precio_unico: variant.precio_unico,
          tallas_stock: variant.tallas_stock
        }
      }, null, 2));
      console.log('```');
      
    } else {
      console.log('❌ No se encontró la variante 4');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Detalles:', error);
  } finally {
    await pool.end();
  }
}

testGetVariantById();
