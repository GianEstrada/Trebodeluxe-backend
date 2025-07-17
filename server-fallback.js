// Auto-fallback para evitar error path-to-regexp
// Si hay error, automáticamente usa simple-server.js

try {
  // Intentar cargar el servidor completo
  require('./server-full.js');
} catch (error) {
  if (error.message.includes('path-to-regexp') || error.message.includes('Missing parameter name')) {
    console.log('⚠️  path-to-regexp error detected, falling back to simple server...');
    require('./simple-server.js');
  } else {
    // Si es otro error, mostrar y usar fallback de todas formas
    console.error('❌ Error in main server:', error.message);
    console.log('🔄 Falling back to simple server...');
    require('./simple-server.js');
  }
}
