// test-local-with-env.js
require('dotenv').config();

const express = require('express');
const OrdersAdminController = require('./src/controllers/orders-admin.controller');

const app = express();
app.use(express.json());

// Crear rutas temporales SIN autenticación para testing
app.get('/test-orders', async (req, res) => {
  console.log('🧪 Testing getAllOrders...');
  
  // Simular req.query
  req.query = {
    page: 1,
    limit: 10,
    sort_by: 'fecha_creacion',
    sort_order: 'desc'
  };
  
  try {
    await OrdersAdminController.getAllOrders(req, res);
  } catch (error) {
    console.error('❌ Error in getAllOrders:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/test-stats', async (req, res) => {
  console.log('🧪 Testing getOrdersStats...');
  
  try {
    await OrdersAdminController.getOrdersStats(req, res);
  } catch (error) {
    console.error('❌ Error in getOrdersStats:', error);
    res.status(500).json({ error: error.message });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`🚀 Test server running on port ${port}`);
  console.log('📋 Available endpoints:');
  console.log(`   GET http://localhost:${port}/test-orders`);
  console.log(`   GET http://localhost:${port}/test-stats`);
  console.log('\n🔍 Test these endpoints to verify the controller works');
});
