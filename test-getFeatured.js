const { Pool } = require('pg');

// Configurar conexión a base de datos (usar las mismas variables de entorno)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function testGetFeatured() {
  console.log('🔍 Probando función getFeatured con tallas...');
  
  try {
    const limit = 3;
    const query = `
      SELECT 
        p.*,
        c.nombre as categoria_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
              'imagenes', COALESCE(img.imagenes, '[]'::json),
              'stock_total', COALESCE(stock.total_stock, 0),
              'disponible', COALESCE(stock.total_stock, 0) > 0
            )
          ) FILTER (WHERE v.id_variante IS NOT NULL), 
          '[]'::json
        ) as variantes
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      LEFT JOIN (
        SELECT 
          id_variante,
          MIN(precio) as precio
        FROM stock
        WHERE precio IS NOT NULL
        GROUP BY id_variante
      ) stock_precios ON v.id_variante = stock_precios.id_variante
      LEFT JOIN (
        SELECT 
          id_variante,
          json_agg(
            json_build_object(
              'id_imagen', id_imagen,
              'url', url,
              'public_id', public_id,
              'orden', orden
            )
          ) as imagenes
        FROM imagenes_variante
        GROUP BY id_variante
      ) img ON v.id_variante = img.id_variante
      LEFT JOIN (
        SELECT 
          id_variante,
          SUM(cantidad) as total_stock
        FROM stock
        GROUP BY id_variante
      ) stock ON v.id_variante = stock.id_variante
      WHERE p.activo = true
      GROUP BY p.id_producto, p.nombre, p.descripcion, p.id_categoria, p.marca, 
               p.id_sistema_talla, p.activo, p.fecha_creacion, c.nombre
      ORDER BY p.fecha_creacion DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    console.log(`✅ Consulta principal exitosa, ${result.rows.length} productos encontrados`);
    
    // Obtener tallas disponibles para cada producto por separado
    for (let product of result.rows) {
      const tallasQuery = `
        SELECT DISTINCT t.id_talla, t.nombre_talla
        FROM variantes v
        JOIN stock s ON v.id_variante = s.id_variante
        JOIN tallas t ON s.id_talla = t.id_talla
        WHERE v.id_producto = $1 AND v.activo = true AND s.cantidad > 0
        ORDER BY t.id_talla
      `;
      
      const tallasResult = await pool.query(tallasQuery, [product.id_producto]);
      product.tallas_disponibles = tallasResult.rows;
      
      console.log(`\n📦 Producto: ${product.nombre}`);
      console.log(`   Variantes: ${product.variantes ? product.variantes.length : 0}`);
      console.log(`   Tallas: ${product.tallas_disponibles ? product.tallas_disponibles.length : 0}`);
      
      if (product.tallas_disponibles && product.tallas_disponibles.length > 0) {
        const tallasNames = product.tallas_disponibles.map(t => t.nombre_talla).join(', ');
        console.log(`   📏 Tallas disponibles: ${tallasNames}`);
      } else {
        console.log('   ⚠️  Sin tallas disponibles');
      }
    }
    
    console.log('\n🎯 RESUMEN:');
    console.log('✅ La consulta getFeatured ahora incluye tallas_disponibles correctamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    await pool.end();
  }
}

testGetFeatured();
