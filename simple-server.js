/**
 * simple-server.js
 * 
 * Versión simplificada del servidor para el despliegue en Render.com
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Cargar variables de entorno
dotenv.config();

// Configuración de la conexión a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false // Necesario para conexiones SSL a servicios como Render
  }
});

// Variables para seguir el estado de la conexión
let isDbConnected = false;
let isCheckingConnection = false;
let lastConnectionAttempt = 0;

// Verificar la conexión a la DB
const checkDbConnection = async () => {
  const now = Date.now();
  
  // Si ya estamos verificando o si no ha pasado 1 segundo desde el último intento, no hacer nada
  if (isCheckingConnection || (now - lastConnectionAttempt < 1000)) {
    return isDbConnected;
  }

  isCheckingConnection = true;
  lastConnectionAttempt = now;

  try {
    const client = await pool.connect();
    // Verificar que realmente podemos hacer una consulta
    await client.query('SELECT 1');
    console.log('Conexión exitosa a la base de datos PostgreSQL');
    isDbConnected = true;
    client.release();
    return true;
  } catch (err) {
    console.error('Error al conectar a la base de datos PostgreSQL:', err);
    isDbConnected = false;
    return false;
  } finally {
    isCheckingConnection = false;
  }
};

// Verificar la conexión al iniciar
checkDbConnection();

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Ruta de estado (health check)
app.get('/api/health', async (req, res) => {
  try {
    // Verificar la conexión a la base de datos
    if (!isDbConnected) {
      await checkDbConnection();
    }
    
    // Si aún está conectado, obtener un timestamp desde la DB
    if (isDbConnected) {
      try {
        const dbResult = await pool.query('SELECT NOW()');
        return res.status(200).json({
          status: 'ok',
          message: 'El servidor está funcionando correctamente',
          database: 'connected',
          version: '1.0.0',
          timestamp: dbResult.rows[0].now || new Date().toISOString()
        });
      } catch (error) {
        console.error('Error al ejecutar consulta SQL:', error);
        isDbConnected = false;
      }
    }
    
    // Si la DB no está conectada, devolver un estado que lo indique
    return res.status(200).json({
      status: 'warning',
      message: 'El servidor está funcionando pero la base de datos no está conectada',
      database: 'disconnected',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en health check:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al verificar el estado del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
