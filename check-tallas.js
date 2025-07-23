const { pool } = require('./src/config/db');

async function checkTallas() {
  try {
    const result = await pool.query('SELECT * FROM tallas ORDER BY id_talla');
    console.log('Tallas disponibles:', result.rows);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTallas();
