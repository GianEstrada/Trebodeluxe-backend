/**
 * simple-server.js
 * 
 * Versión simplificada del servidor para el despliegue en Render.com
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Ruta de estado (health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'El servidor está funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'API de Trebodeluxe Backend',
    routes: [
      { path: '/api/health', method: 'GET', description: 'Verificar estado del servidor' },
      { path: '/api/auth/register', method: 'POST', description: 'Registrar nuevo usuario' },
      { path: '/api/auth/login', method: 'POST', description: 'Iniciar sesión' }
    ]
  });
});

// Ruta para manejar rutas desconocidas
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;

// Manejar errores de puerto en uso
const server = app.listen(PORT, () => {
  console.log(`Servidor simple ejecutándose en el puerto ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Puerto ${PORT} en uso, intentando con puerto ${PORT + 1}`);
    app.listen(PORT + 1, () => {
      console.log(`Servidor simple ejecutándose en el puerto ${PORT + 1}`);
    });
  } else {
    console.error('Error al iniciar servidor:', err);
  }
});

// Para cuando necesitemos detener el servidor
process.on('SIGTERM', () => {
  console.info('SIGTERM recibido, cerrando servidor HTTP');
  server.close(() => {
    console.log('Servidor HTTP cerrado');
  });
});

module.exports = app;
