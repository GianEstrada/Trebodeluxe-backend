// test-orders-admin.js - Script para probar la funcionalidad de administración de pedidos

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTestOrders() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Creando datos de prueba para pedidos...');
    
    // 1. Verificar si hay usuarios
    const users = await client.query('SELECT id_usuario FROM usuarios LIMIT 1');
    let userId = null;
    
    if (users.rows.length === 0) {
      console.log('   Creando usuario de prueba...');
      const userResult = await client.query(`
        INSERT INTO usuarios (nombres, apellidos, correo, contrasena, usuario, rol) 
        VALUES ('Cliente', 'Prueba', 'cliente@test.com', 'password123', 'cliente_prueba', 'user')
        RETURNING id_usuario
      `);
      userId = userResult.rows[0].id_usuario;
    } else {
      userId = users.rows[0].id_usuario;
    }
    
    // 2. Crear información de envío
    console.log('   Creando información de envío...');
    const shippingResult = await client.query(`
      INSERT INTO informacion_envio (id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais)
      VALUES ($1, 'Cliente Prueba', '555-0123', 'Calle Falsa 123', 'Ciudad Prueba', 'Estado Prueba', '12345', 'México')
      RETURNING id_informacion
    `, [userId]);
    
    const shippingId = shippingResult.rows[0].id_informacion;
    
    // 3. Obtener métodos de envío y pago
    const envio = await client.query('SELECT id_metodo_envio FROM metodos_envio LIMIT 1');
    const pago = await client.query('SELECT id_metodo_pago FROM metodos_pago LIMIT 1');
    
    // 4. Crear pedidos de prueba con diferentes estados
    const estadosPrueba = ['no_revisado', 'en_proceso', 'preparado', 'enviado', 'listo'];
    const totales = [150.00, 299.99, 75.50, 425.00, 189.95];
    
    for (let i = 0; i < estadosPrueba.length; i++) {
      const estado = estadosPrueba[i];
      const total = totales[i];
      
      console.log(`   Creando pedido con estado: ${estado}`);
      
      const orderResult = await client.query(`
        INSERT INTO pedidos (
          id_usuario, 
          id_informacion_envio, 
          id_metodo_envio, 
          id_metodo_pago, 
          estado, 
          total,
          notas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id_pedido
      `, [
        userId,
        shippingId,
        envio.rows[0].id_metodo_envio,
        pago.rows[0].id_metodo_pago,
        estado,
        total,
        `Pedido de prueba con estado ${estado}`
      ]);
      
      console.log(`   ✅ Pedido ${orderResult.rows[0].id_pedido} creado con estado: ${estado}`);
    }
    
    console.log('✅ Datos de prueba creados exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function testOrdersAPI() {
  console.log('\n🧪 Probando endpoints de la API de pedidos...');
  
  try {
    // Simular llamadas a la API que haría el frontend
    console.log('   Nota: Para probar la API completa, necesitas tener el servidor ejecutándose');
    console.log('   Rutas disponibles:');
    console.log('   - GET  /api/admin/orders - Obtener todos los pedidos');
    console.log('   - GET  /api/admin/orders/stats - Obtener estadísticas');
    console.log('   - GET  /api/admin/orders/:id - Obtener pedido específico');
    console.log('   - PUT  /api/admin/orders/:id - Actualizar pedido');
    
    // Verificar datos directamente en la base de datos
    const client = await pool.connect();
    
    console.log('\n📊 Verificando datos en la base de datos...');
    
    // Contar pedidos por estado
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_pedidos,
        COUNT(CASE WHEN estado = 'no_revisado' THEN 1 END) as no_revisado,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'preparado' THEN 1 END) as preparado,
        COUNT(CASE WHEN estado = 'enviado' THEN 1 END) as enviado,
        COUNT(CASE WHEN estado = 'listo' THEN 1 END) as listo,
        COALESCE(SUM(total), 0) as ingresos_totales
      FROM pedidos
    `);
    
    const stat = stats.rows[0];
    console.log('   📋 Estadísticas de pedidos:');
    console.log(`      Total: ${stat.total_pedidos}`);
    console.log(`      No Revisado: ${stat.no_revisado}`);
    console.log(`      En Proceso: ${stat.en_proceso}`);
    console.log(`      Preparado: ${stat.preparado}`);
    console.log(`      Enviado: ${stat.enviado}`);
    console.log(`      Listo: ${stat.listo}`);
    console.log(`      Ingresos Totales: $${parseFloat(stat.ingresos_totales).toFixed(2)}`);
    
    // Obtener lista de pedidos
    const orders = await client.query(`
      SELECT 
        p.id_pedido,
        p.estado,
        p.total,
        p.fecha_creacion,
        u.nombres,
        u.apellidos,
        ie.ciudad
      FROM pedidos p
      LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
      LEFT JOIN informacion_envio ie ON p.id_informacion_envio = ie.id_informacion
      ORDER BY p.fecha_creacion DESC
    `);
    
    console.log('\n📦 Lista de pedidos:');
    orders.rows.forEach(order => {
      console.log(`   #${order.id_pedido} - ${order.estado} - $${parseFloat(order.total).toFixed(2)} - ${order.nombres} ${order.apellidos}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error probando API:', error);
  }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
  createTestOrders()
    .then(() => testOrdersAPI())
    .then(() => {
      console.log('\n🎉 Pruebas completadas exitosamente');
      console.log('\n🚀 Ahora puedes:');
      console.log('   1. Iniciar el servidor backend');
      console.log('   2. Ir a la página de administración');
      console.log('   3. Probar la funcionalidad de gestión de pedidos');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { createTestOrders, testOrdersAPI };
