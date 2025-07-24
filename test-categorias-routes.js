require('dotenv').config();

try {
  console.log('🧪 Probando carga de rutas...');
  
  const categorias = require('./src/routes/categorias.routes.js');
  console.log('✅ Rutas de categorías cargadas exitosamente');
  console.log('Tipo:', typeof categorias);
  console.log('Stack length:', categorias.stack ? categorias.stack.length : 'No stack');
  
} catch (error) {
  console.error('❌ Error al cargar rutas de categorías:', error.message);
  console.error('Stack:', error.stack);
}
