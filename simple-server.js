/**
 * simple-server.js
 * 
 * Versión simplificada del servidor para el despliegue en Render.com
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Configurar manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('ERROR NO CAPTURADO 💥');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (error) => {
  console.error('PROMESA RECHAZADA NO MANEJADA 💥');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
});

// Cargar variables de entorno
dotenv.config();
console.log('Variables de entorno cargadas');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Puerto configurado:', process.env.PORT);

try {
  // Importar rutas y configuración
  console.log('Importando módulos...');
  
  console.log('Importando configuración de base de datos...');
  const db = require('./src/config/db');
  
  console.log('Importando rutas...');
  const authRoutes = require('./src/routes/auth.routes');
  const userRoutes = require('./src/routes/user.routes');
  const shippingRoutes = require('./src/routes/shipping.routes');
  
  // Crear la aplicación Express
  console.log('Creando aplicación Express...');
  const app = express();

  // Middlewares
  console.log('Configurando middlewares...');
  app.use(morgan('dev')); // Logging de solicitudes
  app.use(helmet()); // Seguridad HTTP
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Rutas base
  console.log('Configurando rutas...');
  
  app.get('/', (req, res) => {
    res.json({ 
      message: 'API de Trebodeluxe Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      console.log('Verificando estado de la base de datos...');
      const dbStatus = await db.checkConnection();
      console.log('Estado de la base de datos:', dbStatus);
      
      if (dbStatus.connected) {
        res.status(200).json({
          status: 'ok',
          message: 'El servidor está funcionando correctamente',
          database: 'connected',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: 'Error al conectar con la base de datos',
          database: 'disconnected'
        });
      }
    } catch (error) {
      console.error('Error en health check:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al verificar el estado del servidor',
        error: error.message
      });
    }
  });

  // Rutas de la API
  console.log('Configurando rutas de la API...');
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/shipping', shippingRoutes);
  app.use('/api/products', require('./src/routes/product.routes'));

  // Middleware para rutas no encontradas
  app.use((req, res) => {
    console.log('Ruta no encontrada:', req.method, req.path);
    res.status(404).json({
      message: 'Ruta no encontrada',
      method: req.method,
      path: req.path
    });
  });

  // Middleware para manejo de errores
  app.use((err, req, res, next) => {
    console.error('Error en la aplicación:', err);
    res.status(err.status || 500).json({
      message: err.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  });

  // Iniciar servidor
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`
    🚀 Servidor iniciado exitosamente
    📡 Puerto: ${PORT}
    🌍 Ambiente: ${process.env.NODE_ENV}
    
    Rutas disponibles:
    - GET  /api/health
    - POST /api/auth/register
    - POST /api/auth/login
    - GET  /api/auth/profile (protegida)
    `);
  });

} catch (error) {
  console.error('ERROR FATAL AL INICIAR EL SERVIDOR 💥');
  console.error('Mensaje:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
