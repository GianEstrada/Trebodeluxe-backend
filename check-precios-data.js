const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkVariantesData() {
  const client = await pool.connect();
  try {
    // Verificar si hay variantes con precios
    const result = await client.query(`
      SELECT v.id_variante, v.nombre, v.precio, v.precio_original,
             p.nombre as producto_nombre
      FROM variantes v
      JOIN productos p ON v.id_producto = p.id_producto
      WHERE v.precio IS NOT NULL
      LIMIT 10;
    `);
    
    console.log('Variantes con precios en la tabla variantes:');
    result.rows.forEach(row => {
      console.log(`- ID: ${row.id_variante}, Producto: ${row.producto_nombre}, Variante: ${row.nombre}, Precio: ${row.precio}, Precio Original: ${row.precio_original}`);
    });

    // Verificar stock existente
    const stockResult = await client.query(`
      SELECT s.id_stock, s.id_variante, s.precio, s.precio_original,
             v.nombre as variante_nombre, p.nombre as producto_nombre
      FROM stock s
      JOIN variantes v ON s.id_variante = v.id_variante
      JOIN productos p ON s.id_producto = p.id_producto
      WHERE s.precio IS NOT NULL OR s.precio_original IS NOT NULL
      LIMIT 10;
    `);
    
    console.log('\nStock con precios en la tabla stock:');
    stockResult.rows.forEach(row => {
      console.log(`- Stock ID: ${row.id_stock}, Variante: ${row.variante_nombre}, Precio: ${row.precio}, Precio Original: ${row.precio_original}`);
    });

    // Contar totales
    const countVariantes = await client.query('SELECT COUNT(*) FROM variantes WHERE precio IS NOT NULL');
    const countStock = await client.query('SELECT COUNT(*) FROM stock WHERE precio IS NOT NULL');
    
    console.log(`\nTotal variantes con precio: ${countVariantes.rows[0].count}`);
    console.log(`Total stock con precio: ${countStock.rows[0].count}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkVariantesData().catch(console.error);
