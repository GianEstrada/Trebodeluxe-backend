const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' 
});

async function checkSchema() {
  try {
    console.log('🔍 Verificando estructura de pedido_detalle...');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pedido_detalle' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columnas de pedido_detalle:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n� Ejemplo de datos en pedido_detalle...');
    const dataResult = await pool.query('SELECT * FROM pedido_detalle LIMIT 1');
    if (dataResult.rows.length > 0) {
      console.log('Ejemplo de registro:');
      console.log(JSON.stringify(dataResult.rows[0], null, 2));
    } else {
      console.log('No hay datos en pedido_detalle');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkSchema();
