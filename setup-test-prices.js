const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupTestPrices() {
  try {
    console.log('=== CONFIGURANDO PRECIOS DE PRUEBA ===\n');
    
    // Actualizar precios para la variante 4 con precios diferenciados
    await pool.query(`
      UPDATE stock 
      SET precio = CASE 
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'XS') THEN 500
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'S') THEN 500
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'M') THEN 560
        WHEN id_talla = (SELECT id_talla FROM tallas WHERE nombre_talla = 'L') THEN 499
      END
      WHERE id_variante = 4
    `);
    
    console.log('✅ Precios actualizados para la variante 4');
    
    // Verificar los precios actualizados
    const result = await pool.query(`
      SELECT 
        t.nombre_talla, 
        s.precio, 
        s.cantidad,
        t.orden
      FROM stock s
      INNER JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = 4
      ORDER BY t.orden
    `);
    
    console.log('Nuevos precios por talla:');
    console.table(result.rows);
    
    // Análisis de precios
    const analysis = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
        MIN(s.precio) as precio_min,
        MAX(s.precio) as precio_max,
        CASE 
          WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN 'UNIFORME'
          ELSE 'DIFERENCIADO'
        END as tipo_precio
      FROM stock s
      WHERE s.id_variante = 4
    `);
    
    console.log('\nAnálisis de precios:');
    console.table(analysis.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

setupTestPrices();
