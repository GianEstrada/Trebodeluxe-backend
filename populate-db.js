const db = require('./src/config/db.js');
const fs = require('fs');

async function executeSchema() {
  try {
    const schema = fs.readFileSync('./src/config/complete_schema.sql', 'utf8');
    console.log('Ejecutando schema...');
    await db.query(schema);
    console.log('Schema ejecutado exitosamente!');
    
    // Verificar datos insertados
    const productos = await db.query('SELECT COUNT(*) as count FROM productos');
    const variantes = await db.query('SELECT COUNT(*) as count FROM variantes'); 
    const stock = await db.query('SELECT COUNT(*) as count FROM stock');
    
    console.log('Productos:', productos.rows[0].count);
    console.log('Variantes:', variantes.rows[0].count);
    console.log('Stock entries:', stock.rows[0].count);
    
    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

executeSchema();
