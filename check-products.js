const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkProducts() {
  try {
    console.log('=== VERIFICANDO PRODUCTOS DISPONIBLES ===\n');
    
    const result = await pool.query(`
      SELECT p.id_producto, p.nombre, COUNT(v.id_variante) as total_variantes
      FROM productos p
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      WHERE p.activo = true
      GROUP BY p.id_producto, p.nombre
      ORDER BY p.id_producto
    `);
    
    console.log('Productos disponibles:');
    console.table(result.rows);
    
    if (result.rows.length > 0) {
      const productId = result.rows[0].id_producto;
      console.log(`\nProbando con producto ID: ${productId}`);
      
      // Llamar al modelo
      const ProductModel = require('./src/models/product.model');
      const product = await ProductModel.getById(productId);
      
      if (product) {
        console.log('✅ Producto encontrado:');
        console.log(`   ID: ${product.id_producto}`);
        console.log(`   Nombre: ${product.nombre}`);
        console.log(`   Variantes: ${product.variantes ? product.variantes.length : 0}`);
        
        if (product.variantes && product.variantes.length > 0) {
          console.log('\n   Variantes con análisis de precios:');
          product.variantes.forEach((v, index) => {
            console.log(`   ${index + 1}. ${v.nombre}`);
            console.log(`      Precio único: ${v.precio_unico}`);
            console.log(`      Precios distintos: ${v.precios_distintos}`);
            if (v.precio_unico) {
              console.log(`      Precio: $${v.precio_minimo}`);
            } else {
              console.log(`      Rango: $${v.precio_minimo} - $${v.precio_maximo}`);
            }
          });
        }
      } else {
        console.log('❌ Producto no encontrado con getById');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkProducts();
