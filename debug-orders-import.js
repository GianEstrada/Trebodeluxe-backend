// Debug script to test orders controller import
console.log('🔍 Testing Orders Controller Import...');

try {
  const OrdersController = require('./src/controllers/orders.controller');
  console.log('✅ OrdersController imported successfully');
  console.log('✅ OrdersController type:', typeof OrdersController);
  console.log('✅ OrdersController.createOrder type:', typeof OrdersController.createOrder);
  console.log('✅ OrdersController.getOrderById type:', typeof OrdersController.getOrderById);
  console.log('✅ OrdersController.getOrderByReference type:', typeof OrdersController.getOrderByReference);
  console.log('✅ Available methods:', Object.getOwnPropertyNames(OrdersController));
} catch (error) {
  console.error('❌ Error importing OrdersController:', error.message);
  console.error('❌ Stack:', error.stack);
}

try {
  const ordersRoutes = require('./src/routes/orders.routes');
  console.log('✅ Orders routes imported successfully');
} catch (error) {
  console.error('❌ Error importing orders routes:', error.message);
  console.error('❌ Stack:', error.stack);
}
