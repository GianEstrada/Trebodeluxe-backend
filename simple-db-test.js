// simple-test.js - Simple database test

const db = require('./src/config/db');

db.pool.query('SELECT COUNT(*) as orders FROM pedidos')
  .then(result => {
    console.log('✅ Database connection working!');
    console.log('Orders count:', result.rows[0].orders);
    
    // Test if the categorias table exists and has data
    return db.pool.query('SELECT COUNT(*) as categories FROM categorias');
  })
  .then(result => {
    console.log('Categories count:', result.rows[0].categories);
    
    // Test the join that was failing
    return db.pool.query(`
      SELECT pr.nombre, cat.nombre as categoria
      FROM productos pr 
      LEFT JOIN categorias cat ON pr.id_categoria = cat.id_categoria 
      LIMIT 1
    `);
  })
  .then(result => {
    console.log('✅ Product-Category join works!');
    if (result.rows.length > 0) {
      console.log('Sample:', result.rows[0]);
    }
    console.log('🎉 SQL fix should work correctly now!');
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  })
  .finally(() => {
    process.exit();
  });
