const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool } = require('./src/config/db');

dotenv.config();

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors({
  origin: ['https://trebodeluxe-front.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Middleware de debugging para todas las requests del carrito
app.use('/api/cart', (req, res, next) => {
  console.log(`🛒 CART REQUEST: ${req.method} ${req.path}`);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  next();
});

// Importar rutas del carrito
const cartRoutes = require('./src/routes/cart.routes');
app.use('/api/cart', cartRoutes);

// Health check con test de DB
app.get('/api/health', async (req, res) => {
  try {
    // Test de conexión a la base de datos
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as server_time');
    client.release();

    // Test de tablas del carrito
    const client2 = await pool.connect();
    const tablesResult = await client2.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('carritos', 'contenido_carrito')
    `);
    client2.release();

    res.json({
      status: 'OK',
      message: 'Servidor y base de datos funcionando',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        server_time: result.rows[0].server_time,
        cart_tables: tablesResult.rows.map(row => row.table_name)
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error de conexión a la base de datos',
      error: error.message
    });
  }
});

// Test endpoint para verificar datos de carrito en DB
app.get('/api/debug/cart-data', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Obtener todos los carritos
    const carritos = await client.query('SELECT * FROM carritos ORDER BY fecha_creacion DESC LIMIT 10');
    
    // Obtener todo el contenido de carritos
    const contenido = await client.query('SELECT * FROM contenido_carrito ORDER BY fecha_agregado DESC LIMIT 10');
    
    // Contar productos de prueba disponibles
    const productosTest = await client.query(`
      SELECT p.id_producto, p.nombre, v.id_variante, v.nombre as variante, t.id_talla, t.nombre_talla
      FROM productos p
      JOIN variantes v ON p.id_producto = v.id_producto
      JOIN stock s ON s.id_producto = p.id_producto AND s.id_variante = v.id_variante
      JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.cantidad > 0
      LIMIT 5
    `);
    
    client.release();
    
    res.json({
      success: true,
      data: {
        carritos: carritos.rows,
        contenido: contenido.rows,
        productos_disponibles: productosTest.rows
      }
    });
  } catch (error) {
    console.error('❌ Debug cart data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Cart Debug Server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`🛒 Cart API: http://localhost:${PORT}/api/cart`);
  console.log(`🔍 Debug: http://localhost:${PORT}/api/debug/cart-data`);
});

module.exports = app;
