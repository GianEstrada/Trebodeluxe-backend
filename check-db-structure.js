const { Pool } = require('pg');

// Usar la conexión de Neon que proporcionó el usuario
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function checkTables() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...\n');
    
    // Ver todas las tablas
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('📋 Tablas en la base de datos:');
    console.table(tablesResult.rows);
    
    // Ver estructura de tabla de productos y variantes
    const productTableQuery = `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%product%' OR table_name LIKE '%variant%' OR table_name LIKE '%stock%' 
           OR table_name = 'variantes' OR table_name = 'productos' OR table_name = 'tallas')
      ORDER BY table_name, ordinal_position;
    `;
    
    const productTableResult = await pool.query(productTableQuery);
    console.log('\n📊 Estructura de tablas relacionadas:');
    console.table(productTableResult.rows);
    
    // Probar query específica para variantes como en debug-stock-issue.js
    console.log('\n🧪 Probando query de variantes (como en debug-stock-issue.js):');
    const variantTestQuery = `
      SELECT COUNT(*) as total_variantes FROM variantes;
    `;
    
    const variantTestResult = await pool.query(variantTestQuery);
    console.log('✅ Total variantes encontradas:', variantTestResult.rows[0].total_variantes);
    
    // Probar query de stock
    const stockTestQuery = `
      SELECT COUNT(*) as total_stock FROM stock;
    `;
    
    const stockTestResult = await pool.query(stockTestQuery);
    console.log('✅ Total registros de stock:', stockTestResult.rows[0].total_stock);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();
