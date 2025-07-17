const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const PostgresDatabase = require('./postgres-database');

const PORT = process.env.PORT || 5000;

// Inicializar base de datos PostgreSQL
const database = new PostgresDatabase();

// Importar servicio de autenticación pero usar la nueva base de datos
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'treboluxe_secret_key_2024';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

class PostgreSQLAuthService {
  constructor(db) {
    this.db = db;
  }

  // Generar tokens JWT
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    return { accessToken, refreshToken };
  }

  // Verificar token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Hash de contraseña
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Verificar contraseña
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Registro de usuario
  async register(userData) {
    try {
      // Validar datos requeridos
      const { email, password, firstName, lastName } = userData;
      
      if (!email || !password || !firstName || !lastName) {
        throw new Error('Todos los campos requeridos deben ser proporcionados');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Formato de email inválido');
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.db.getUserByEmail(email);
      if (existingUser) {
        throw new Error('Ya existe un usuario con este email');
      }

      // Hash de la contraseña
      const hashedPassword = await this.hashPassword(password);

      // Crear usuario
      const newUser = await this.db.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generar tokens
      const tokens = this.generateTokens(newUser);

      // Guardar refresh token en la base de datos
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      
      await this.db.saveToken(newUser.id, tokens.refreshToken, 'refresh', refreshExpiresAt);

      // Retornar usuario sin contraseña
      const { password: _, ...userWithoutPassword } = newUser;
      
      return {
        success: true,
        user: userWithoutPassword,
        tokens
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Inicio de sesión
  async login(email, password) {
    try {
      // Validar datos requeridos
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      // Buscar usuario
      const user = await this.db.getUserByEmail(email);
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar si el usuario está activo
      if (!user.is_active) {
        throw new Error('Cuenta desactivada');
      }

      // Generar tokens
      const tokens = this.generateTokens(user);

      // Guardar refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      
      await this.db.saveToken(user.id, tokens.refreshToken, 'refresh', refreshExpiresAt);

      // Retornar usuario sin contraseña
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        tokens
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Renovar token
  async refreshToken(refreshToken) {
    try {
      // Verificar refresh token
      const payload = this.verifyToken(refreshToken);
      
      // Verificar si el token está en la base de datos y es válido
      const tokenRecord = await this.db.getValidToken(refreshToken, 'refresh');
      if (!tokenRecord) {
        throw new Error('Refresh token inválido');
      }

      // Obtener usuario actualizado
      const user = await this.db.getUserById(payload.id);
      if (!user || !user.is_active) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // Generar nuevos tokens
      const newTokens = this.generateTokens(user);

      // Marcar el token anterior como usado
      await this.db.markTokenAsUsed(tokenRecord.id);

      // Guardar nuevo refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      
      await this.db.saveToken(user.id, newTokens.refreshToken, 'refresh', refreshExpiresAt);

      return {
        success: true,
        tokens: newTokens
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener perfil de usuario
  async getUserProfile(userId) {
    try {
      const user = await this.db.getUserById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const { password: _, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Inicializar servicio de autenticación con PostgreSQL
const authService = new PostgreSQLAuthService(database);

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
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Función helper para manejar CORS preflight
function handleCORS(res) {
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
    // RUTAS DE SISTEMAS DE TALLAS
    // ==========================================

    // Obtener sistemas de tallas
    if (pathname === '/api/size-systems' && method === 'GET') {
      try {
        const sizeSystems = await database.getSizeSystems();
        sendJSON(res, {
          success: true,
          sizeSystems
        });
      } catch (error) {
        sendJSON(res, {
          success: false,
          error: 'Error obteniendo sistemas de tallas'
        }, 500);
      }
      return;
    }

    // Crear sistema de tallas
    if (pathname === '/api/size-systems' && method === 'POST') {
      try {
        const { name, sizes } = await parseBody(req);
        const sizeSystem = await database.createSizeSystem(name, sizes);
        sendJSON(res, {
          success: true,
          sizeSystem
        }, 201);
      } catch (error) {
        sendJSON(res, {
          success: false,
          error: 'Error creando sistema de tallas'
        }, 500);
      }
      return;
    }

    // ==========================================
    // RUTAS BÁSICAS
    // ==========================================

    // Health check
    if (pathname === '/health' && method === 'GET') {
      const isDbHealthy = await database.isHealthy();
      sendJSON(res, {
        status: isDbHealthy ? 'OK' : 'DB_ERROR',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'PostgreSQL Auth server is running',
        database: {
          type: 'PostgreSQL',
          connected: database.isConnected,
          healthy: isDbHealthy
        },
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/refresh',
          'POST /api/auth/verify',
          'GET /api/auth/profile',
          'GET /api/size-systems',
          'POST /api/size-systems'
        ]
      }, isDbHealthy ? 200 : 503);
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
            <title>Treboluxe PostgreSQL Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #1a6b1a; }
              .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #1a6b1a; }
              .method { font-weight: bold; color: #1a6b1a; }
              .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
              .connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🐘 Treboluxe PostgreSQL Authentication Server</h1>
              <div class="status connected">
                ✅ Conectado a PostgreSQL en Render
              </div>
              <p>Servidor de autenticación con base de datos PostgreSQL funcionando correctamente</p>
              
              <h2>Endpoints disponibles:</h2>
              <div class="endpoint"><span class="method">POST</span> /api/auth/register - Registro de usuario</div>
              <div class="endpoint"><span class="method">POST</span> /api/auth/login - Inicio de sesión</div>
              <div class="endpoint"><span class="method">POST</span> /api/auth/refresh - Renovar token</div>
              <div class="endpoint"><span class="method">POST</span> /api/auth/verify - Verificar token</div>
              <div class="endpoint"><span class="method">GET</span> /api/auth/profile - Obtener perfil</div>
              <div class="endpoint"><span class="method">GET</span> /api/size-systems - Obtener sistemas de tallas</div>
              <div class="endpoint"><span class="method">POST</span> /api/size-systems - Crear sistema de tallas</div>
              <div class="endpoint"><span class="method">GET</span> /health - Estado del servidor</div>
              
              <h2>Usuario admin por defecto:</h2>
              <p><strong>Email:</strong> admin@treboluxe.com</p>
              <p><strong>Password:</strong> admin123</p>
              
              <h2>Base de datos:</h2>
              <p><strong>Tipo:</strong> PostgreSQL</p>
              <p><strong>Host:</strong> Render Cloud</p>
              <p><strong>Estado:</strong> ${database.isConnected ? 'Conectado' : 'Desconectado'}</p>
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
        'GET /api/size-systems',
        'POST /api/size-systems',
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

// Inicializar conexión a la base de datos
async function initializeDatabase() {
  console.log('🔌 Conectando a PostgreSQL...');
  const connected = await database.connect();
  
  if (connected) {
    console.log('✅ PostgreSQL conectado exitosamente');
  } else {
    console.error('❌ Error conectando a PostgreSQL');
    process.exit(1);
  }
}

// Inicializar la base de datos antes de iniciar el servidor
initializeDatabase().then(() => {
  // Iniciar servidor
  server.listen(PORT, () => {
    console.log(`🐘 Servidor PostgreSQL corriendo en puerto ${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   POST http://localhost:${PORT}/api/auth/refresh`);
    console.log(`   POST http://localhost:${PORT}/api/auth/verify`);
    console.log(`   GET  http://localhost:${PORT}/api/auth/profile`);
    console.log(`   GET  http://localhost:${PORT}/api/size-systems`);
    console.log(`   POST http://localhost:${PORT}/api/size-systems`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(``);
    console.log(`💡 Usuario admin por defecto:`);
    console.log(`   Email: admin@treboluxe.com`);
    console.log(`   Password: admin123`);
    console.log(``);
    console.log(`🌐 Panel web: http://localhost:${PORT}/`);
  });
}).catch((error) => {
  console.error('❌ Error inicializando el servidor:', error);
  process.exit(1);
});

// Manejo de errores
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Puerto ${PORT} ya está en uso`);
  } else {
    console.error('❌ Error del servidor:', error);
  }
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await database.close();
  process.exit(0);
});

module.exports = server;
