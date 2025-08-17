// test-order-fix.js - Test the fixed order details SQL query

const db = require('./src/config/db');

async function testOrderFix() {
  try {
    console.log('🔍 Testing fixed order details SQL query...');
    
    // First, check if there are any orders
    const ordersResult = await db.pool.query('SELECT COUNT(*) as count, MIN(id_pedido) as first_id FROM pedidos');
    const orderCount = ordersResult.rows[0].count;
    const firstOrderId = ordersResult.rows[0].first_id;
    
    console.log(`📦 Total orders in database: ${orderCount}`);
    
    if (orderCount > 0) {
      console.log(`🎯 Testing with order ID: ${firstOrderId}`);
      
      // Test the fixed SQL query directly
      const detailsQuery = `
        SELECT 
          pd.*,
          pr.nombre as producto_nombre,
          cat.nombre as producto_categoria,
          v.nombre as variante_nombre,
          COALESCE(s.precio, pd.precio_unitario) as variante_precio,
          t.nombre_talla,
          st.nombre as sistema_talla
        FROM pedido_detalle pd
        JOIN productos pr ON pd.id_producto = pr.id_producto
        LEFT JOIN categorias cat ON pr.id_categoria = cat.id_categoria
        JOIN variantes v ON pd.id_variante = v.id_variante
        LEFT JOIN tallas t ON pd.id_talla = t.id_talla
        LEFT JOIN sistemas_talla st ON t.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN stock s ON pd.id_variante = s.id_variante AND pd.id_talla = s.id_talla
        WHERE pd.id_pedido = $1
        ORDER BY pd.id_detalle
      `;
      
      const result = await db.pool.query(detailsQuery, [firstOrderId]);
      
      console.log('✅ SQL query executed successfully!');
      console.log(`📋 Found ${result.rows.length} order details`);
      
      if (result.rows.length > 0) {
        console.log('📄 Sample order detail:');
        const sample = result.rows[0];
        console.log({
          id_detalle: sample.id_detalle,
          producto_nombre: sample.producto_nombre,
          producto_categoria: sample.producto_categoria,
          variante_nombre: sample.variante_nombre,
          cantidad: sample.cantidad,
          precio_unitario: sample.precio_unitario
        });
      }
      
      console.log('🎉 Order details endpoint should now work correctly!');
      
    } else {
      console.log('⚠️  No orders found in database - creating a test case might be needed');
    }
    
  } catch (error) {
    console.error('❌ Error testing order fix:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit();
  }
}

testOrderFix();
