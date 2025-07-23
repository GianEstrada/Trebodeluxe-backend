const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar middlewares
const authMiddleware = require('./src/middlewares/auth');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const userRoutes = require('./src/routes/users');
const siteSettingsRoutes = require('./src/routes/siteSettings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/site-settings', siteSettingsRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running with database fix applied',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Database connection fix applied`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
