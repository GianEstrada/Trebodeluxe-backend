const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla ordenes...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'ordenes' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estructura de la tabla ordenes:');
    console.log('='.repeat(80));
    console.log('COLUMNA'.padEnd(25) + ' | ' + 'TIPO'.padEnd(15) + ' | ' + 'NULLABLE'.padEnd(10) + ' | ' + 'DEFAULT');
    console.log('-'.repeat(80));
    
    result.rows.forEach(row => {
      console.log(
        `${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(10)} | ${row.column_default || 'NULL'}`
      );
    });
    
    // Verificar específicamente si existe seguro_envio
    console.log('\n🎯 Análisis del campo seguro_envio:');
    const seguroField = result.rows.find(row => row.column_name === 'seguro_envio');
    
    if (seguroField) {
      console.log('✅ Campo seguro_envio EXISTE');
      console.log(`   - Tipo: ${seguroField.data_type}`);
      console.log(`   - Nullable: ${seguroField.is_nullable}`);
      console.log(`   - Default: ${seguroField.column_default || 'NULL'}`);
    } else {
      console.log('❌ Campo seguro_envio NO EXISTE');
      console.log('   - Se necesita agregar a la tabla');
    }
    
    // Mostrar también algunos registros recientes para ver los valores
    console.log('\n📊 Últimas 3 órdenes para verificar datos:');
    const recentOrders = await pool.query(`
      SELECT id_orden, numero_referencia, seguro_envio, fecha_creacion 
      FROM ordenes 
      ORDER BY fecha_creacion DESC 
      LIMIT 3;
    `);
    
    if (recentOrders.rows.length > 0) {
      console.log('ID_ORDEN | REFERENCIA | SEGURO_ENVIO | FECHA');
      console.log('-'.repeat(60));
      recentOrders.rows.forEach(order => {
        console.log(`${order.id_orden.toString().padEnd(8)} | ${order.numero_referencia.padEnd(10)} | ${order.seguro_envio} | ${order.fecha_creacion}`);
      });
    } else {
      console.log('No hay órdenes en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar tabla:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
