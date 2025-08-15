// check-orders-simple.js
const { Pool } = require('pg');
require('dotenv').config();

console.log('DATABASE_URL existe:', !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    const client = await pool.connect();
    
    console.log('✅ Conexión exitosa');
    
    // Verificar pedidos
    const pedidos = await client.query('SELECT COUNT(*) as total FROM pedidos');
    console.log('📊 Total pedidos:', pedidos.rows[0].total);
    
    if (parseInt(pedidos.rows[0].total) > 0) {
      const lista = await client.query(`
        SELECT p.id_pedido, p.estado, p.total, p.fecha_creacion,
               u.nombres, u.apellidos
        FROM pedidos p
        LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
        ORDER BY p.fecha_creacion DESC LIMIT 5
      `);
      
      console.log('📦 Pedidos encontrados:');
      lista.rows.forEach(p => {
        console.log(`   #${p.id_pedido} - ${p.estado} - $${p.total} - ${p.nombres} ${p.apellidos}`);
      });
    } else {
      console.log('❌ No hay pedidos en la base de datos');
    }
    
    client.release();
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
