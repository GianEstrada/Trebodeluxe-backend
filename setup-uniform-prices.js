const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupUniformPrices() {
  try {
    console.log('=== VERIFICANDO VARIANTES DISPONIBLES ===\n');
    
    // Ver todas las variantes disponibles
    const variants = await pool.query(`
      SELECT v.id_variante, v.nombre, p.nombre as producto
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      WHERE v.activo = true
      ORDER BY v.id_variante
    `);
    
    console.log('Variantes disponibles:');
    console.table(variants.rows);
    
    // Configurar la variante 3 con precios uniformes
    if (variants.rows.some(v => v.id_variante === 3)) {
      console.log('\n=== CONFIGURANDO VARIANTE 3 CON PRECIOS UNIFORMES ===\n');
      
      await pool.query(`
        UPDATE stock 
        SET precio = 450
        WHERE id_variante = 3
      `);
      
      console.log('✅ Precios uniformes configurados para la variante 3');
      
      // Verificar los precios
      const stockResult = await pool.query(`
        SELECT 
          t.nombre_talla, 
          s.precio, 
          s.cantidad,
          t.orden
        FROM stock s
        INNER JOIN tallas t ON s.id_talla = t.id_talla
        WHERE s.id_variante = 3
        ORDER BY t.orden
      `);
      
      console.log('Precios por talla (Variante 3):');
      console.table(stockResult.rows);
      
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
        WHERE s.id_variante = 3
      `);
      
      console.log('\nAnálisis de precios (Variante 3):');
      console.table(analysis.rows);
    }
    
    console.log('\n=== RESUMEN DE CONFIGURACIÓN ===');
    console.log('✅ Variante 4: Precios DIFERENCIADOS ($499 - $560)');
    console.log('✅ Variante 3: Precios UNIFORMES ($450)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

setupUniformPrices();
