const { pool } = require('./src/config/db');

async function consultarTallas() {
  try {
    const result = await pool.query('SELECT id_talla, nombre_talla, orden FROM tallas ORDER BY orden');
    
    console.log('Tallas disponibles:');
    result.rows.forEach(t => {
      console.log(`ID: ${t.id_talla}, Nombre: ${t.nombre_talla}, Orden: ${t.orden}`);
    });
    
    // También consultar tallas de la variante 4
    const stockQuery = `
      SELECT DISTINCT s.id_talla, t.nombre_talla 
      FROM stock s 
      JOIN tallas t ON s.id_talla = t.id_talla 
      WHERE s.id_variante = 4 
      ORDER BY t.orden
    `;
    
    const stockResult = await pool.query(stockQuery);
    console.log('\nTallas en stock para variante 4:');
    stockResult.rows.forEach(t => {
      console.log(`ID: ${t.id_talla}, Nombre: ${t.nombre_talla}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

consultarTallas();
