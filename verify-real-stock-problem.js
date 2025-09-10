const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function verifyStockProblem() {
  try {
    console.log('🔍 Verificando el problema real de stock...\n');
    
    // Ver todos los productos
    const productosQuery = `SELECT * FROM productos ORDER BY id_producto;`;
    const productosResult = await pool.query(productosQuery);
    console.log('📦 Productos disponibles:');
    console.table(productosResult.rows);
    
    // Ver todas las variantes
    const variantesQuery = `SELECT * FROM variantes ORDER BY id_variante;`;
    const variantesResult = await pool.query(variantesQuery);
    console.log('\n🎨 Variantes disponibles:');
    console.table(variantesResult.rows);
    
    // Ver todo el stock
    const stockQuery = `SELECT * FROM stock ORDER BY id_variante, id_talla;`;
    const stockResult = await pool.query(stockQuery);
    console.log('\n📊 Stock disponible:');
    console.table(stockResult.rows);
    
    // Ver todas las tallas
    const tallasQuery = `SELECT * FROM tallas ORDER BY id_talla;`;
    const tallasResult = await pool.query(tallasQuery);
    console.log('\n📏 Tallas disponibles:');
    console.table(tallasResult.rows);
    
    // Replicar el problema: ver cómo se calcula stock por producto
    if (productosResult.rows.length > 0) {
      const productId = productosResult.rows[0].id_producto;
      console.log(`\n🎯 Analizando problema de stock para producto ID: ${productId}`);
      
      const stockAnalysisQuery = `
        SELECT 
          p.nombre as producto,
          v.nombre as variante,
          t.nombre_talla as talla,
          s.cantidad as stock_real,
          
          -- Esto es lo que ve el frontend (suma total por talla de todas las variantes)
          (SELECT SUM(s2.cantidad) 
           FROM stock s2 
           INNER JOIN variantes v2 ON s2.id_variante = v2.id_variante 
           WHERE v2.id_producto = p.id_producto 
             AND s2.id_talla = s.id_talla 
             AND v2.activo = true
          ) as stock_frontend_suma_total
          
        FROM productos p
        INNER JOIN variantes v ON p.id_producto = v.id_producto
        INNER JOIN stock s ON v.id_variante = s.id_variante
        INNER JOIN tallas t ON s.id_talla = t.id_talla
        WHERE p.id_producto = $1 
          AND v.activo = true
        ORDER BY v.nombre, t.nombre_talla;
      `;
      
      const stockAnalysisResult = await pool.query(stockAnalysisQuery, [productId]);
      console.table(stockAnalysisResult.rows);
      
      if (stockAnalysisResult.rows.length > 0) {
        const firstRow = stockAnalysisResult.rows[0];
        console.log('\n🚨 PROBLEMA IDENTIFICADO:');
        console.log(`- Stock real para ${firstRow.variante} ${firstRow.talla}: ${firstRow.stock_real}`);
        console.log(`- Stock que ve el frontend: ${firstRow.stock_frontend_suma_total}`);
        console.log('- El frontend suma TODAS las variantes para cada talla');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verifyStockProblem();
