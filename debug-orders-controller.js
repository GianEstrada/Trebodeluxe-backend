// Debug: Script para verificar que todas las funciones del controlador están definidas
const ordersController = require('./src/controllers/orders.controller');

console.log('🔍 [DEBUG] Verificando OrdersController...');
console.log('🔍 [DEBUG] Tipo:', typeof ordersController);
console.log('🔍 [DEBUG] Propiedades:');

const methods = [
  'createOrder',
  'getOrderById', 
  'getOrderByReference',
  'getOrderByPaymentIntent',
  'updateOrderStatus',
  'getUserOrders',
  'handleStripeWebhook',
  'createSkyDropXOrder'
];

methods.forEach(method => {
  console.log(`   - ${method}:`, typeof ordersController[method]);
  if (typeof ordersController[method] !== 'function') {
    console.log(`     ❌ PROBLEMA: ${method} no es una función`);
  }
});

console.log('');
console.log('🔍 [DEBUG] Todas las propiedades del controlador:');
console.log(Object.getOwnPropertyNames(ordersController));

console.log('');
console.log('🔍 [DEBUG] Verificando skyDropXService...');
try {
  const skyDropXService = require('./src/services/skydropx.service');
  console.log('   - skyDropXService tipo:', typeof skyDropXService);
  console.log('   - skyDropXService.createOrder:', typeof skyDropXService.createOrder);
} catch (error) {
  console.log('   ❌ Error importando skyDropXService:', error.message);
}

console.log('');
console.log('🔍 [DEBUG] Verificando db...');
try {
  const db = require('./src/config/db');
  console.log('   - db tipo:', typeof db);
  console.log('   - db.pool:', typeof db.pool);
} catch (error) {
  console.log('   ❌ Error importando db:', error.message);
}
