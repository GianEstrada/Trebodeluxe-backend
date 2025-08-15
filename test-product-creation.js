// test-product-creation.js
require('dotenv').config();
const { Pool } = require('pg');

async function testProductCreation() {
  console.log('🧪 Probando creación de productos...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    
    // 1. Verificar que existan las tablas necesarias
    console.log('📊 Verificando tablas necesarias...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('productos', 'variantes', 'imagenes_variante', 'stock', 'categorias', 'sistemas_talla')
      ORDER BY table_name
    `);
    
    console.log('✅ Tablas encontradas:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // 2. Verificar estructura de productos
    console.log('\n📋 Estructura de tabla productos:');
    const productCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position
    `);
    productCols.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // 3. Verificar estructura de variantes
    console.log('\n🔄 Estructura de tabla variantes:');
    const variantCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'variantes' 
      ORDER BY ordinal_position
    `);
    variantCols.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // 4. Verificar categorías disponibles
    console.log('\n📂 Categorías disponibles:');
    const categories = await client.query('SELECT id_categoria, nombre FROM categorias ORDER BY nombre');
    categories.rows.forEach(cat => {
      console.log(`  - ${cat.id_categoria}: ${cat.nombre}`);
    });
    
    // 5. Verificar sistemas de talla
    console.log('\n📏 Sistemas de talla disponibles:');
    const sizeSystems = await client.query('SELECT id_sistema, nombre FROM sistemas_talla ORDER BY nombre');
    sizeSystems.rows.forEach(sys => {
      console.log(`  - ${sys.id_sistema}: ${sys.nombre}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Verificación completada!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testProductCreation();
