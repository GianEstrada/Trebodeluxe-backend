const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function testCorrectedGetByIdQuery() {
    try {
        console.log('🧪 Probando query CORREGIDO con campo disponible...\n');
        
        // Query corregido con el campo disponible
        const query = `
        SELECT 
          p.*,
          st.nombre as sistema_talla_nombre,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
              'activo', v.activo,
              'disponible', (v.activo AND COALESCE(stock_info.stock_total, 0) > 0 AND COALESCE(stock_precios.precio, 0) > 0),
              'stock_total', COALESCE(stock_info.stock_total, 0),
              'imagenes', COALESCE(img.imagenes, '[]'::json),
              'stock_disponible', COALESCE(stock_info.stock_total, 0),
              'tallas_disponibles', COALESCE(stock_info.tallas, '[]'::json),
              'precio_minimo', precios_info.precio_minimo,
              'precio_maximo', precios_info.precio_maximo,
              'precios_distintos', precios_info.precios_distintos,
              'precio_unico', precios_info.precio_unico
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes,
          (
            SELECT json_agg(
              json_build_object(
                'id_talla', tallas_info.id_talla,
                'nombre_talla', tallas_info.nombre_talla,
                'orden', tallas_info.orden,
                'cantidad', tallas_info.total_cantidad
              ) ORDER BY tallas_info.orden, tallas_info.id_talla
            )
            FROM (
              SELECT DISTINCT 
                t.id_talla,
                t.nombre_talla,
                t.orden,
                COALESCE(stock_sum.total_cantidad, 0) as total_cantidad
              FROM tallas t
              LEFT JOIN (
                SELECT 
                  s.id_talla,
                  SUM(s.cantidad) as total_cantidad
                FROM stock s
                INNER JOIN variantes v2 ON s.id_variante = v2.id_variante
                WHERE v2.id_producto = p.id_producto AND v2.activo = true
                GROUP BY s.id_talla
              ) stock_sum ON t.id_talla = stock_sum.id_talla
              WHERE stock_sum.total_cantidad > 0
            ) tallas_info
          ) as tallas_disponibles
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL AND precio > 0
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
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        LEFT JOIN (
          SELECT 
            s.id_variante,
            SUM(s.cantidad) as stock_total,
            json_agg(
              json_build_object(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'orden', t.orden,
                'cantidad', s.cantidad,
                'precio', s.precio
              )
            ) FILTER (WHERE s.cantidad > 0) as tallas
          FROM stock s
          INNER JOIN tallas t ON s.id_talla = t.id_talla
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
          WHERE s.precio > 0
          GROUP BY s.id_variante
        ) precios_info ON v.id_variante = precios_info.id_variante
        WHERE p.id_producto = $1 AND p.activo = true
        GROUP BY p.id_producto, st.nombre
      `;
      
        console.log('🔍 Ejecutando query CORREGIDO para producto ID: 5');
        const result = await pool.query(query, [5]);
        
        if (result.rows.length > 0) {
            const product = result.rows[0];
            console.log('\n📦 Producto encontrado:', product.nombre);
            console.log('📋 Número de variantes:', product.variantes?.length || 0);
            
            if (product.variantes && product.variantes.length > 0) {
                console.log('\n🎨 Detalles de variantes CON CAMPO DISPONIBLE:');
                product.variantes.forEach((variant, index) => {
                    console.log(`\n${index + 1}. ${variant.nombre} (ID: ${variant.id_variante})`);
                    console.log(`   - Activa: ${variant.activo}`);
                    console.log(`   - ✅ DISPONIBLE: ${variant.disponible}`); // NUEVO CAMPO
                    console.log(`   - Precio: $${variant.precio || 'Sin precio'}`);
                    console.log(`   - Stock total: ${variant.stock_total}`);
                    console.log(`   - Stock disponible: ${variant.stock_disponible}`);
                    console.log(`   - Imágenes: ${variant.imagenes?.length || 0}`);
                    
                    // Verificar criterios individuales
                    const activaOk = variant.activo;
                    const stockOk = variant.stock_total > 0;
                    const precioOk = variant.precio > 0;
                    
                    console.log(`   - Criterios:`);
                    console.log(`     * Activa: ${activaOk ? '✅' : '❌'}`);
                    console.log(`     * Stock > 0: ${stockOk ? '✅' : '❌'} (${variant.stock_total})`);
                    console.log(`     * Precio > 0: ${precioOk ? '✅' : '❌'} ($${variant.precio})`);
                    console.log(`     * ✅ RESULTADO DISPONIBLE: ${variant.disponible ? '✅ SÍ' : '❌ NO'}`);
                });
            }
            
        } else {
            console.log('❌ No se encontró el producto con ID 5');
        }
        
        console.log('\n🎯 ANÁLISIS PARA FRONTEND:');
        if (result.rows.length > 0 && result.rows[0].variantes) {
            const variantes = result.rows[0].variantes;
            
            console.log('\n📋 ¿Qué verá el frontend ahora?');
            variantes.forEach(variant => {
                const seraClickeable = variant.disponible && variant.stock_total > 0;
                console.log(`   ${variant.nombre}: ${seraClickeable ? '✅ CLICKEABLE' : '❌ DESHABILITADO'}`);
                console.log(`     - disponible: ${variant.disponible}`);
                console.log(`     - stock_total: ${variant.stock_total}`);
                console.log(`     - Condición frontend: !variant.disponible || variant.stock_total <= 0 = ${!variant.disponible || variant.stock_total <= 0}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testCorrectedGetByIdQuery();
