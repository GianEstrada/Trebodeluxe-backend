const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Importar módulos de autenticación
const { AuthService, authenticateToken, requireAdmin, optionalAuth } = require('./auth');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración CORS específica para producción en Render
const allowedOrigins = [
  'https://trebodeluxe-front.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean); // Elimina valores null/undefined

console.log('Orígenes CORS permitidos:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origin (como las aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    // Comprobar si el origen está permitido
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      console.log('CORS bloqueó solicitud de:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server is running'
  });
});

// Ruta para servir la pantalla de carga
app.get('/loading', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loading.html'));
});

// Ruta raíz que redirige a la pantalla de carga
app.get('/', (req, res) => {
  res.redirect('/loading');
});

// Endpoint para verificar el estado del frontend
app.get('/api/frontend-status', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://trebodeluxe-front.onrender.com';
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${frontendUrl}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      res.json({ 
        status: 'ready', 
        message: 'Frontend is ready',
        frontendUrl: frontendUrl
      });
    } else {
      res.status(503).json({ 
        status: 'not_ready', 
        message: 'Frontend is not ready yet' 
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not_ready', 
      message: 'Frontend is not ready yet',
      error: error.message 
    });
  }
});

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

// Inicializar servicio de autenticación
const authService = new AuthService();

// Registro de usuario
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Solicitud de registro recibida:', req.body);
    const result = await authService.register(req.body);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: result.user,
        tokens: result.tokens
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Inicio de sesión
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Solicitud de login recibida:', req.body);
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        user: result.user,
        tokens: result.tokens
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Renovar token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token requerido'
      });
    }
    
    const result = await authService.refreshToken(refreshToken);
    
    if (result.success) {
      res.json({
        success: true,
        tokens: result.tokens
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error en refresh token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Verificar token (endpoint público para validar tokens)
app.post('/api/auth/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token requerido'
      });
    }
    
    const decoded = authService.verifyToken(token);
    res.json({
      success: true,
      valid: true,
      user: decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Token inválido'
    });
  }
});

// Middleware para rutas no encontradas (IMPORTANTE: esto debe ir DESPUÉS de todas las rutas definidas)
app.use('*', (req, res) => {
  console.log(`Ruta no encontrada: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📝 Documentación de API: http://localhost:${PORT}/api-tester.html`);
});
