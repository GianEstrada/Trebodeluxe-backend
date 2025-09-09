// Test just the class definition without DB
console.log('🔍 Testing class definition only...');

// Mock the db module to avoid connection issues
const mockDb = {
  pool: {
    connect: () => ({
      query: () => {},
      release: () => {}
    }),
    query: () => {}
  }
};

// Mock the service
const mockService = {
  createOrder: () => ({ success: true }),
  getAccessToken: () => 'mock-token'
};

console.log('✅ Mocks created');

// Now test importing
try {
  // Temporarily replace the require cache
  const originalRequire = require;
  require = function(id) {
    if (id === '../config/db') return mockDb;
    if (id === '../services/skydropx.service') return mockService;
    return originalRequire.apply(this, arguments);
  };

  delete require.cache[require.resolve('./src/controllers/orders.controller.js')];
  const OrdersController = require('./src/controllers/orders.controller.js');
  
  console.log('✅ OrdersController loaded');
  console.log('✅ Type:', typeof OrdersController);
  console.log('✅ Is function/class:', typeof OrdersController === 'function');
  console.log('✅ Constructor name:', OrdersController.name);
  console.log('✅ Methods:', Object.getOwnPropertyNames(OrdersController));
  console.log('✅ createOrder method:', typeof OrdersController.createOrder);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('❌ Stack:', error.stack);
}
