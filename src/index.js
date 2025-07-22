const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/db');
const fs = require('fs');

console.log("🚀 Starting server from the latest index.js - Version:", new Date().toISOString());

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.DATABASE_URL) {
  dotenv.config(); // Fallback para producción
}

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const shippingRoutes = require('./routes/shipping.routes');
const productRoutes = require('./routes/product.routes');
const promotionRoutes = require('./routes/promotion.routes');
const sizesRoutes = require('./routes/sizes.routes');
const imageRoutes = require('./routes/image.routes');
const adminProductRoutes = require('./routes/admin.product.routes');
const adminRoutes = require('./routes/admin.routes');
const siteSettingsRoutes = require('./routes/site-settings.routes');

// Importar middlewares
const { notFound, errorHandler } = require('./middlewares/error.middleware');

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(helmet()); // Seguridad HTTP
app.use(morgan('dev')); // Registro de solicitudes HTTP
// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: true, // Esto permite solicitudes de cualquier origen
  credentials: true, // Permite credenciales
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));
app.use(express.json()); // Parsear cuerpo de solicitudes JSON
app.use(express.urlencoded({ extended: true })); // Parsear cuerpo de solicitudes URL-encoded

// Ruta base
app.get('/', (req, res) => {
  res.json({ message: 'API de Trebodeluxe Backend' });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await db.checkConnection();
    
    if (dbStatus.connected) {
      return res.status(200).json({ 
        success: true, 
        status: 'ok', 
        message: 'El servidor está funcionando correctamente',
        database: 'connected',
        databaseInfo: {
          version: dbStatus.version,
          pool: dbStatus.poolStatus
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Conexión a la base de datos establecida pero no se recibieron datos',
        database: 'error'
      });
    }
  } catch (error) {
    console.error('Error en health check:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Error al conectar con la base de datos',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Rutas de la API
console.log('Registrando rutas de la API...');
app.use('/api/auth', authRoutes);
console.log('✅ Rutas auth registradas');
app.use('/api/users', userRoutes);
console.log('✅ Rutas users registradas');
app.use('/api/shipping', shippingRoutes);
console.log('✅ Rutas shipping registradas');
app.use('/api/products', productRoutes);
console.log('✅ Rutas products registradas');
app.use('/api/promotions', promotionRoutes);
console.log('✅ Rutas promotions registradas');
app.use('/api/images', imageRoutes);
console.log('✅ Rutas images registradas');
app.use('/api/admin/products', adminProductRoutes);
console.log('✅ Rutas admin products registradas');
app.use('/api/admin', adminRoutes);
console.log('✅ Rutas admin registradas');
app.use('/api/site-settings', siteSettingsRoutes);
console.log('✅ Rutas site-settings registradas');
console.log('Importando y registrando rutas de sizes...');
try {
  console.log('Intentando importar sizes.routes.js...');
  const sizesRoutes = require('./routes/sizes.routes');
  console.log('✅ sizes.routes.js importado correctamente.');
  app.use('/api/sizes', sizesRoutes);
  console.log('✅ Rutas de sizes registradas exitosamente.');
  // Registrar las mismas rutas bajo /api/size-systems para compatibilidad con el frontend
  app.use('/api/size-systems', sizesRoutes);
  console.log('✅ Rutas de size-systems registradas exitosamente.');
} catch (error) {
  console.error('❌ Error al importar sizes.routes.js:', error);
}
console.log('Todas las rutas de la API han sido registradas.');

// Listar archivos en el directorio routes
const routesPath = path.join(__dirname, 'routes');
console.log('Archivos en el directorio routes:', fs.readdirSync(routesPath));

// Middlewares de manejo de errores
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`📋 Commit actual esperado: 07fbd7f - Add test route for sizes`);
  console.log(`\n🛣️  Rutas disponibles:`);
  console.log(`- GET  /api/health`);
  console.log(`- POST /api/auth/register`);
  console.log(`- POST /api/auth/login`);
  console.log(`- GET  /api/auth/profile (protegida)`);
  console.log(`- GET  /api/sizes/test (nuevo)`);
  console.log(`- GET  /api/sizes/systems (nuevo)`);
  console.log(`- GET  /api/sizes (nuevo)`);
  console.log(`\n⚠️  Si no ves los logs de configuración de sizes arriba, hay un problema de deploy.`);
});

module.exports = app;
