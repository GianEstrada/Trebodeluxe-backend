const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { AuthService } = require('./auth');

const PORT = process.env.PORT || 5000;

// Inicializar servicio de autenticación
const authService = new AuthService();

// Función helper para parsear JSON del body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    
    req.on('error', reject);
  });
}

// Función helper para enviar respuestas JSON
function sendJSON(res, data, status = 200) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://trebodeluxe-front.onrender.com';
  
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.end(JSON.stringify(data));
}

// Función helper para manejar CORS preflight
function handleCORS(res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.end();
}

// Crear servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${pathname}`);

  // Manejar CORS preflight
  if (method === 'OPTIONS') {
    return handleCORS(res);
  }

  try {
    // ==========================================
    // RUTAS DE AUTENTICACIÓN
    // ==========================================

    // Registro de usuario
    if (pathname === '/api/auth/register' && method === 'POST') {
      const userData = await parseBody(req);
      const result = await authService.register(userData);
      
      if (result.success) {
        sendJSON(res, {
          success: true,
          message: 'Usuario registrado exitosamente',
          user: result.user,
          tokens: result.tokens
        }, 201);
      } else {
        sendJSON(res, {
          success: false,
          error: result.error
        }, 400);
      }
      return;
    }

    // Inicio de sesión
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await parseBody(req);
      const result = await authService.login(email, password);
      
      if (result.success) {
        sendJSON(res, {
          success: true,
          message: 'Inicio de sesión exitoso',
          user: result.user,
          tokens: result.tokens
        });
      } else {
        sendJSON(res, {
          success: false,
          error: result.error
        }, 401);
      }
      return;
    }

    // Renovar token
    if (pathname === '/api/auth/refresh' && method === 'POST') {
      const { refreshToken } = await parseBody(req);
      
      if (!refreshToken) {
        sendJSON(res, {
          success: false,
          error: 'Refresh token requerido'
        }, 401);
        return;
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      if (result.success) {
        sendJSON(res, {
          success: true,
          tokens: result.tokens
        });
      } else {
        sendJSON(res, {
          success: false,
          error: result.error
        }, 401);
      }
      return;
    }

    // Verificar token
    if (pathname === '/api/auth/verify' && method === 'POST') {
      const { token } = await parseBody(req);
      
      if (!token) {
        sendJSON(res, {
          success: false,
          error: 'Token requerido'
        }, 400);
        return;
      }
      
      try {
        const decoded = authService.verifyToken(token);
        sendJSON(res, {
          success: true,
          valid: true,
          user: decoded
        });
      } catch (error) {
        sendJSON(res, {
          success: false,
          valid: false,
          error: 'Token inválido'
        }, 401);
      }
      return;
    }

    // Obtener perfil (requiere token)
    if (pathname === '/api/auth/profile' && method === 'GET') {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        sendJSON(res, {
          success: false,
          error: 'Token requerido'
        }, 401);
        return;
      }
      
      try {
        const decoded = authService.verifyToken(token);
        const result = await authService.getUserProfile(decoded.id);
        
        if (result.success) {
          sendJSON(res, {
            success: true,
            user: result.user
          });
        } else {
          sendJSON(res, {
            success: false,
            error: result.error
          }, 404);
        }
      } catch (error) {
        sendJSON(res, {
          success: false,
          error: 'Token inválido'
        }, 401);
      }
      return;
    }

    // ==========================================
    // RUTAS BÁSICAS
    // ==========================================

    // Health check
    if (pathname === '/health' && method === 'GET') {
      sendJSON(res, {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Auth server is running',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/refresh',
          'POST /api/auth/verify',
          'GET /api/auth/profile'
        ]
      });
      return;
    }

    // Servir pantalla de carga
    if (pathname === '/loading' || pathname === '/' && method === 'GET') {
      const loadingPath = path.join(__dirname, 'public', 'loading.html');
      
      if (fs.existsSync(loadingPath)) {
        const content = fs.readFileSync(loadingPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Treboluxe Auth Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #1a6b1a; }
              .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #1a6b1a; }
              .method { font-weight: bold; color: #1a6b1a; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔐 Treboluxe Authentication Server</h1>
              <p>Servidor de autenticación funcionando correctamente</p>
              
              <h2>Endpoints disponibles:</h2>
              <div class="endpoint"><span class="method">POST</span> /api/auth/register - Registro de usuario</div>
              <div class="endpoint"><span class="method">POST</span> /api/auth/login - Inicio de sesión</div>
              <div class="endpoint"><span class="method">POST</span> /api/auth/refresh - Renovar token</div>
              <div class="endpoint"><span class="method">POST</span> /api/auth/verify - Verificar token</div>
              <div class="endpoint"><span class="method">GET</span> /api/auth/profile - Obtener perfil</div>
              <div class="endpoint"><span class="method">GET</span> /health - Estado del servidor</div>
              
              <h2>Usuario admin por defecto:</h2>
              <p><strong>Email:</strong> admin@treboluxe.com</p>
              <p><strong>Password:</strong> admin123</p>
            </div>
          </body>
          </html>
        `);
      }
      return;
    }

    // Ruta no encontrada
    sendJSON(res, {
      success: false,
      error: 'Ruta no encontrada',
      available_endpoints: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/refresh',
        'POST /api/auth/verify',
        'GET /api/auth/profile',
        'GET /health'
      ]
    }, 404);

  } catch (error) {
    console.error('Error:', error);
    sendJSON(res, {
      success: false,
      error: 'Error interno del servidor'
    }, 500);
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🔐 Servidor de autenticación corriendo en puerto ${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   POST http://localhost:${PORT}/api/auth/refresh`);
  console.log(`   POST http://localhost:${PORT}/api/auth/verify`);
  console.log(`   GET  http://localhost:${PORT}/api/auth/profile`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(``);
  console.log(`💡 Usuario admin por defecto:`);
  console.log(`   Email: admin@treboluxe.com`);
  console.log(`   Password: admin123`);
  console.log(``);
  console.log(`🌐 Panel web: http://localhost:${PORT}/`);
});

// Manejo de errores
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
  } else {
    console.error('❌ Error del servidor:', error);
  }
});

module.exports = server;
