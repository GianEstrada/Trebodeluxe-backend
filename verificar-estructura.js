require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificarEstructura() {
  const client = await pool.connect();
  try {
    console.log('=== VERIFICACIÓN DE ESTRUCTURA ===');
    
    // Verificar si existe la tabla categorías
    const tablasCategorias = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categorias'
      );
    `);
    
    console.log('📂 Tabla categorías existe:', tablasCategorias.rows[0].exists);
    
    if (tablasCategorias.rows[0].exists) {
      const categoriasCount = await client.query('SELECT COUNT(*) FROM categorias');
      console.log('   - Registros en categorías:', categoriasCount.rows[0].count);
      
      // Mostrar algunas categorías
      const categorias = await client.query('SELECT * FROM categorias LIMIT 3');
      console.log('   - Primeras categorías:');
      categorias.rows.forEach(cat => console.log(`     * ${cat.nombre}`));
    }
    
    // Verificar columnas de stock
    const columnasStock = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n💰 Columnas en tabla stock:');
    columnasStock.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    
    // Verificar columnas de productos
    const columnasProductos = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n🛍️ Columnas en tabla productos:');
    columnasProductos.rows.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    
  } finally {
    client.release();
    pool.end();
  }
}

verificarEstructura().catch(console.error);
