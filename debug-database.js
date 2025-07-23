// debug-database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugDatabase() {
  try {
    // Verificar el constraint de la tabla pedidos
    const constraintQuery = `
      SELECT 
        conname,  
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'pedidos_estado_check';
    `;
    
    const constraintResult = await pool.query(constraintQuery);
    console.log('Constraint definition:', constraintResult.rows);
    
    // Verificar si existe algún pedido con estado 'carrito'
    const cartQuery = `
      SELECT id_pedido, estado FROM pedidos WHERE estado = 'carrito' LIMIT 5;
    `;
    
    const cartResult = await pool.query(cartQuery);
    console.log('Existing cart orders:', cartResult.rows);
    
    // Probar crear un pedido simple
    const testQuery = `
      INSERT INTO pedidos (id_usuario, estado, total) 
      VALUES (5, 'pendiente', 0.00) 
      RETURNING id_pedido, estado;
    `;
    
    const testResult = await pool.query(testQuery);
    console.log('Test insertion result:', testResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugDatabase();
