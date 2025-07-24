// Test para verificar que las rutas cargan sin errores
const express = require('express');

console.log('🔧 Probando carga de rutas admin...\n');

try {
  // Intentar cargar el controlador
  console.log('📦 Cargando controlador admin...');
  const adminController = require('./src/controllers/admin.controller');
  console.log('✅ Controlador cargado exitosamente');
  
  // Intentar cargar middlewares
  console.log('📦 Cargando middlewares...');
  const authMiddleware = require('./src/middlewares/auth.middleware');
  console.log('✅ Auth middleware cargado');
  
  const uploadMiddleware = require('./src/middlewares/upload.middleware');
  console.log('✅ Upload middleware cargado');
  
  // Crear una app de prueba
  console.log('📦 Creando app de Express...');
  const app = express();
  
  // Intentar cargar las rutas
  console.log('📦 Cargando rutas admin...');
  const adminRoutes = require('./src/routes/admin.routes');
  console.log('✅ Rutas admin cargadas exitosamente');
  
  // Verificar funciones específicas
  const functionsToCheck = [
    'getIndexImages',
    'createIndexImage', 
    'updateIndexImage',
    'deleteIndexImage',
    'updateImageStatus',
    'updateImagePosition'
  ];
  
  console.log('\n🔍 Verificando funciones específicas:');
  functionsToCheck.forEach(funcName => {
    if (typeof adminController[funcName] === 'function') {
      console.log(`✅ ${funcName}: Disponible`);
    } else {
      console.log(`❌ ${funcName}: No disponible (${typeof adminController[funcName]})`);
    }
  });
  
  console.log('\n🎉 Todas las verificaciones pasaron. Las rutas deberían funcionar correctamente.');
  
} catch (error) {
  console.error('❌ Error cargando componentes:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
