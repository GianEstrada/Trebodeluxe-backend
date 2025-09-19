const { Pool } = require('pg');

const client = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkSchema() {
  try {
    console.log('🔍 Verificando estructura de la tabla productos...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas de la tabla productos:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });
    
    console.log('\n🔍 Verificando tabla categorias...');
    const categorias = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'categorias'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas de la tabla categorias:');
    categorias.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type})`);
    });
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();