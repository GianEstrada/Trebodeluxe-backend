const db = require('./src/config/db');

(async () => {
  try {
    const result = await db.pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imagenes_principales' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Estructura de imagenes_principales:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
