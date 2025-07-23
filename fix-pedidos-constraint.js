// fix-pedidos-constraint.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixConstraint() {
  try {
    console.log('Eliminando constraint actual...');
    await pool.query('ALTER TABLE pedidos DROP CONSTRAINT pedidos_estado_check;');
    
    console.log('Creando nuevo constraint con estado carrito...');
    await pool.query(`
      ALTER TABLE pedidos 
      ADD CONSTRAINT pedidos_estado_check 
      CHECK (estado IN ('carrito', 'pendiente', 'procesando', 'en_espera', 'enviado', 'terminado', 'problema'));
    `);
    
    console.log('✅ Constraint actualizado exitosamente');
    
    // Verificar que funcionó
    const testQuery = `
      INSERT INTO pedidos (id_usuario, estado, total) 
      VALUES (5, 'carrito', 0.00) 
      RETURNING id_pedido, estado;
    `;
    
    const testResult = await pool.query(testQuery);
    console.log('✅ Test con estado carrito exitoso:', testResult.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixConstraint();
