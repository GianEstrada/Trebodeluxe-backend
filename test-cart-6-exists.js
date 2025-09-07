const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' }); // Usar .env.local

// Configuración de conexión directa a la base de datos
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

async function testCartExists() {
  console.log('🔍 Verificando si existe el carrito ID 6...');
  
  const pool = new Pool(dbConfig);
  
  try {
    // Verificar si existe el carrito 6
    const cartQuery = 'SELECT * FROM carritos WHERE id = $1';
    const cartResult = await pool.query(cartQuery, [6]);
    
    console.log('📦 Carrito 6:', cartResult.rows.length > 0 ? 'EXISTE' : 'NO EXISTE');
    
    if (cartResult.rows.length > 0) {
      console.log('📋 Datos del carrito:', cartResult.rows[0]);
      
      // Verificar productos en el carrito
      const itemsQuery = 'SELECT * FROM carrito_items WHERE carrito_id = $1';
      const itemsResult = await pool.query(itemsQuery, [6]);
      
      console.log('🛍️ Items en carrito 6:', itemsResult.rows.length);
      if (itemsResult.rows.length > 0) {
        console.log('📝 Items:', itemsResult.rows);
      }
    } else {
      // Si no existe, crear un carrito de prueba
      console.log('🆕 Creando carrito de prueba...');
      
      const createCartQuery = 'INSERT INTO carritos (usuario_id, session_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *';
      const newCartResult = await pool.query(createCartQuery, [null, 'test-session-hybrid']);
      
      const cartId = newCartResult.rows[0].id;
      console.log('✅ Carrito creado con ID:', cartId);
      
      // Agregar un producto de prueba
      const addItemQuery = `
        INSERT INTO carrito_items (carrito_id, producto_id, variante_id, quantity, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *
      `;
      const itemResult = await pool.query(addItemQuery, [cartId, 1, 1, 2]);
      
      console.log('🛍️ Item agregado:', itemResult.rows[0]);
      console.log('📦 Usa el carrito ID:', cartId, 'para las pruebas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCartExists();
