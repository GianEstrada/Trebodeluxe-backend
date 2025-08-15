// test-orders-api.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Simular el controlador de órdenes
async function testOrdersController() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Probando el controlador de órdenes...');
    
    // Esta es la misma query que usa el controlador
    const query = `
      SELECT 
        p.*,
        u.nombres as cliente_nombres,
        u.apellidos as cliente_apellidos,
        u.correo as cliente_correo,
        ie.nombre_completo as direccion_nombre,
        ie.telefono as direccion_telefono,
        ie.ciudad as direccion_ciudad,
        ie.estado as direccion_estado,
        me.nombre as metodo_envio_nombre,
        mp.nombre as metodo_pago_nombre,
        COUNT(*) OVER() as total_count,
        (
          SELECT COUNT(pd.id_detalle) 
          FROM pedido_detalle pd 
          WHERE pd.id_pedido = p.id_pedido
        ) as total_items
      FROM pedidos p
      LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
      LEFT JOIN informacion_envio ie ON p.id_informacion_envio = ie.id_informacion
      LEFT JOIN metodos_envio me ON p.id_metodo_envio = me.id_metodo_envio
      LEFT JOIN metodos_pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      ORDER BY p.fecha_creacion DESC
      LIMIT 10 OFFSET 0
    `;
    
    const result = await client.query(query);
    
    console.log('📊 Resultados de la query:');
    console.log('   Total filas:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('   Total count:', result.rows[0].total_count);
      
      result.rows.forEach((order, index) => {
        console.log(`   ${index + 1}. #${order.id_pedido} - ${order.estado} - $${order.total}`);
        console.log(`      Cliente: ${order.cliente_nombres} ${order.cliente_apellidos}`);
        console.log(`      Método envío: ${order.metodo_envio_nombre || 'NULL'}`);
        console.log(`      Método pago: ${order.metodo_pago_nombre || 'NULL'}`);
      });
    } else {
      console.log('❌ No se encontraron resultados');
    }
    
  } catch (error) {
    console.error('💥 Error en la query:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testOrdersController();
