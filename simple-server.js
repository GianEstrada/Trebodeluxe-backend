const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://trebodeluxe-front.onrender.com';

// Función para leer archivos
function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// Función para verificar el estado del frontend
async function checkFrontendStatus() {
  return new Promise((resolve) => {
    const frontendUrl = new URL('/api/health', FRONTEND_URL);
    
    const options = {
      hostname: frontendUrl.hostname,
      port: frontendUrl.port || (frontendUrl.protocol === 'https:' ? 443 : 80),
      path: frontendUrl.pathname,
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Treboluxe-Backend-HealthCheck/1.0'
      }
    };

    const protocol = frontendUrl.protocol === 'https:' ? require('https') : require('http');
    
    const req = protocol.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve({ status: 'ready', frontendUrl: FRONTEND_URL });
      } else {
        resolve({ status: 'not_ready', message: `HTTP ${res.statusCode}` });
      }
    });

    req.on('error', (err) => {
      resolve({ status: 'not_ready', message: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'not_ready', message: 'Timeout' });
    });

    req.end();
  });
}

// Crear servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Ruta raíz - redirigir a loading
    if (pathname === '/') {
      res.writeHead(302, { 'Location': '/loading' });
      res.end();
      return;
    }

    // Ruta de loading
    if (pathname === '/loading') {
      const loadingPath = path.join(__dirname, 'public', 'loading.html');
      const content = await readFile(loadingPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    }

    // Health check del backend
    if (pathname === '/health') {
      const healthData = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Backend server is running'
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthData));
      return;
    }

    // Check del estado del frontend
    if (pathname === '/api/frontend-status') {
      const frontendStatus = await checkFrontendStatus();
      const statusCode = frontendStatus.status === 'ready' ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(frontendStatus));
      return;
    }

    // API básica de productos
    if (pathname === '/api/products') {
      const products = [
        {
          id: 1,
          name: "Camiseta Básica Premium",
          price: 24.99,
          image: "/797e7904b64e13508ab322be3107e368-1@2x.png",
          category: "Camisetas"
        }
      ];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(products));
      return;
    }

    // Servir archivos estáticos
    if (pathname.startsWith('/public/') || pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico)$/)) {
      const filePath = path.join(__dirname, 'public', pathname.replace('/public/', ''));
      
      try {
        const content = await readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      } catch (err) {
        // Archivo no encontrado, continuar al 404
      }
    }

    // Cualquier otra ruta redirige a loading
    res.writeHead(302, { 'Location': '/loading' });
    res.end();

  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Loading server running on http://localhost:${PORT}`);
  console.log(`📱 Loading screen available at http://localhost:${PORT}/loading`);
  console.log(`💚 Health check at http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend URL configured: ${FRONTEND_URL}`);
});

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
