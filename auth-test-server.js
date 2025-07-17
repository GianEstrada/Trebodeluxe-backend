const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 5000;

// Función helper para enviar respuestas JSON
function sendJSON(res, data, status = 200) {
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

  // Login básico para testing
  if (pathname === '/api/auth/login' && method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        console.log(`Intento de login: ${email}, ${password}`);
        
        if (email === 'admin@treboluxe.com' && password === 'admin123') {
          sendJSON(res, {
            success: true,
            message: 'Inicio de sesión exitoso',
            user: { id: 1, email, name: 'Admin' },
            tokens: { 
              accessToken: 'fake-token-' + Date.now(),
              refreshToken: 'fake-refresh-' + Date.now()
            }
          });
        } else {
          sendJSON(res, {
            success: false,
            error: 'Credenciales inválidas'
          }, 401);
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        sendJSON(res, { 
          success: false, 
          error: 'Error en la solicitud' 
        }, 400);
      }
    });
    
    return;
  }

  // Register básico para testing
  if (pathname === '/api/auth/register' && method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const userData = JSON.parse(body);
        console.log(`Intento de registro:`, userData);
        
        sendJSON(res, {
          success: true,
          message: 'Usuario registrado exitosamente (modo prueba)',
          user: { id: 2, ...userData },
          tokens: { 
            accessToken: 'fake-token-' + Date.now(),
            refreshToken: 'fake-refresh-' + Date.now()
          }
        }, 201);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        sendJSON(res, { 
          success: false, 
          error: 'Error en la solicitud' 
        }, 400);
      }
    });
    
    return;
  }

  // Health check
  if (pathname === '/health' && method === 'GET') {
    sendJSON(res, {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Server is running in test mode',
      endpoints: [
        'POST /api/auth/login',
        'POST /api/auth/register'
      ]
    });
    return;
  }

  // Diagnóstico para debugging
  if (pathname === '/api/debug' && method === 'GET') {
    sendJSON(res, {
      success: true,
      server: 'auth-test-server.js',
      time: new Date().toISOString(),
      headers: req.headers,
      url: req.url,
      method: req.method,
      pathname: pathname
    });
    return;
  }

  // Por defecto devolvemos un 404
  sendJSON(res, { 
    success: false, 
    error: 'Ruta no encontrada',
    path: pathname,
    method: method,
    server: 'auth-test-server.js'
  }, 404);
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🧪 Servidor de prueba corriendo en puerto ${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/debug`);
  console.log(``);
  console.log(`💡 Usuario admin para pruebas:`);
  console.log(`   Email: admin@treboluxe.com`);
  console.log(`   Password: admin123`);
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
