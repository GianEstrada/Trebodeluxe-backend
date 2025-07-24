// Test simple para verificar las exportaciones del controlador
const adminController = require('./src/controllers/admin.controller');

console.log('🔍 Verificando funciones exportadas...\n');

const requiredFunctions = [
  'getIndexImages',
  'createIndexImage', 
  'updateIndexImage',
  'deleteIndexImage',
  'updateImageStatus',
  'updateImagePosition'
];

requiredFunctions.forEach(funcName => {
  if (typeof adminController[funcName] === 'function') {
    console.log(`✅ ${funcName}: OK`);
  } else {
    console.log(`❌ ${funcName}: ${typeof adminController[funcName]}`);
  }
});

console.log('\n📋 Todas las funciones exportadas:');
console.log(Object.keys(adminController).filter(key => typeof adminController[key] === 'function'));

console.log('\n🎯 Test completado');
