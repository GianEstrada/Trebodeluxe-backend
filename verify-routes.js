// verify-routes.js
const express = require('express');
const ordersAdminRoutes = require('./src/routes/orders-admin.routes');

console.log('🔍 Verificando las rutas de orders-admin...');

// Crear una app temporal para verificar las rutas
const app = express();

// Registrar las rutas
app.use('/api/admin/orders', ordersAdminRoutes);

// Verificar qué rutas están registradas
const routes = [];
app._router.stack.forEach(function(middleware) {
  if (middleware.route) {
    routes.push(middleware.route);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach(function(handler) {
      const route = handler.route;
      if (route) {
        routes.push(route);
      }
    });
  }
});

console.log('📋 Rutas registradas:');
routes.forEach(route => {
  const methods = Object.keys(route.methods).join(', ').toUpperCase();
  console.log(`   ${methods} ${route.path}`);
});

// Verificar si el controlador se puede importar
try {
  const OrdersAdminController = require('./src/controllers/orders-admin.controller');
  console.log('✅ Controlador orders-admin importado correctamente');
  console.log('📋 Métodos disponibles:');
  console.log('   - getAllOrders:', typeof OrdersAdminController.getAllOrders);
  console.log('   - getOrdersStats:', typeof OrdersAdminController.getOrdersStats);
  console.log('   - getOrderById:', typeof OrdersAdminController.getOrderById);
  console.log('   - updateOrder:', typeof OrdersAdminController.updateOrder);
} catch (error) {
  console.error('❌ Error importando controlador:', error.message);
}
