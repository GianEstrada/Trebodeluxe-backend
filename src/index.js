const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./config/db');

// Cargar variables de entorno
dotenv.config();

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const shippingRoutes = require('./routes/shipping.routes');

// Importar middlewares
const { notFound, errorHandler } = require('./middlewares/error.middleware');

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(helmet()); // Seguridad HTTP
app.use(morgan('dev')); // Registro de solicitudes HTTP
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // Parsear cuerpo de solicitudes JSON
app.use(express.urlencoded({ extended: true })); // Parsear cuerpo de solicitudes URL-encoded

// Rutas base
app.get('/', (req, res) => {
  res.json({ message: 'API de Trebodeluxe Backend' });
});

app.get('/api/health', async (req, res) => {
  try {
    const isDbConnected = await db.checkConnection();
    
    if (isDbConnected) {
      return res.status(200).json({ 
        status: 'ok', 
        message: 'El servidor está funcionando correctamente',
        database: 'connected'
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
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipping', shippingRoutes);

// Middlewares de manejo de errores
app.use(notFound);
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
});

module.exports = app;
