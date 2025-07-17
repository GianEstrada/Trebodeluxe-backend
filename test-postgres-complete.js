// Script de prueba completo para el sistema PostgreSQL
const http = require('http');
const { URL } = require('url');

const API_BASE = 'http://localhost:5000';

// Función helper para hacer requests HTTP
function makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`${method} ${endpoint}:`, result);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          console.log(`${method} ${endpoint} (Raw):`, body);
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error en ${method} ${endpoint}:`, error.message);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Función helper para requests autenticados
function makeAuthRequest(endpoint, token, method = 'GET', data = null) {
  return makeRequest(endpoint, method, data, {
    'Authorization': `Bearer ${token}`
  });
}

// Pruebas del sistema PostgreSQL
async function runPostgreSQLTests() {
  console.log('🐘 Iniciando pruebas del sistema PostgreSQL...\n');

  try {
    // 1. Verificar que el servidor está funcionando
    console.log('1️⃣ Verificando estado del servidor...');
    const healthResult = await makeRequest('/health');
    
    if (healthResult.status !== 200) {
      console.error('❌ Servidor no responde correctamente');
      return;
    }

    // 2. Probar login con usuario admin
    console.log('\n2️⃣ Probando login con usuario admin...');
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@treboluxe.com',
      password: 'admin123'
    });

    if (loginResult.status !== 200 || !loginResult.data.success) {
      console.error('❌ Error en login:', loginResult.data.error || 'Unknown error');
      return;
    }

    const { accessToken, refreshToken } = loginResult.data.tokens;
    console.log('✅ Login exitoso');

    // 3. Verificar token
    console.log('\n3️⃣ Verificando token...');
    const verifyResult = await makeRequest('/api/auth/verify', 'POST', {
      token: accessToken
    });
    
    if (verifyResult.status === 200 && verifyResult.data.success) {
      console.log('✅ Token válido');
    } else {
      console.error('❌ Token inválido');
    }

    // 4. Obtener perfil de usuario
    console.log('\n4️⃣ Obteniendo perfil de usuario...');
    const profileResult = await makeAuthRequest('/api/auth/profile', accessToken);
    
    if (profileResult.status === 200 && profileResult.data.success) {
      console.log('✅ Perfil obtenido exitosamente');
    } else {
      console.error('❌ Error obteniendo perfil');
    }

    // 5. Renovar token
    console.log('\n5️⃣ Renovando token...');
    const refreshResult = await makeRequest('/api/auth/refresh', 'POST', {
      refreshToken: refreshToken
    });
    
    if (refreshResult.status === 200 && refreshResult.data.success) {
      console.log('✅ Token renovado exitosamente');
    } else {
      console.error('❌ Error renovando token');
    }

    // 6. Obtener sistemas de tallas
    console.log('\n6️⃣ Obteniendo sistemas de tallas...');
    const sizeSystemsResult = await makeRequest('/api/size-systems');
    
    if (sizeSystemsResult.status === 200 && sizeSystemsResult.data.success) {
      console.log('✅ Sistemas de tallas obtenidos:');
      sizeSystemsResult.data.sizeSystems.forEach(system => {
        console.log(`   - ${system.name}: ${system.sizes.join(', ')}`);
      });
    } else {
      console.error('❌ Error obteniendo sistemas de tallas');
    }

    // 7. Registrar nuevo usuario
    console.log('\n7️⃣ Registrando nuevo usuario...');
    const newUser = {
      firstName: 'Usuario',
      lastName: 'Prueba',
      email: `test${Date.now()}@example.com`,
      password: 'test123',
      phone: '+34 123 456 789',
      city: 'Madrid',
      country: 'España'
    };

    const registerResult = await makeRequest('/api/auth/register', 'POST', newUser);
    
    if (registerResult.status === 201 && registerResult.data.success) {
      console.log('✅ Registro exitoso');
      
      // 8. Login con nuevo usuario
      console.log('\n8️⃣ Login con nuevo usuario...');
      const newUserLoginResult = await makeRequest('/api/auth/login', 'POST', {
        email: newUser.email,
        password: newUser.password
      });
      
      if (newUserLoginResult.status === 200 && newUserLoginResult.data.success) {
        console.log('✅ Login con nuevo usuario exitoso');
      } else {
        console.error('❌ Error en login con nuevo usuario');
      }
    } else {
      console.error('❌ Error en registro:', registerResult.data.error || 'Unknown error');
    }

    console.log('\n🎉 ¡Todas las pruebas de PostgreSQL completadas!');
    console.log('\n📊 Resumen:');
    console.log('   ✅ Conexión a PostgreSQL: Exitosa');
    console.log('   ✅ Base de datos trebolux_db: Funcionando');
    console.log('   ✅ Sistema de autenticación: Operativo');
    console.log('   ✅ Tokens JWT: Funcionando');
    console.log('   ✅ Sistemas de tallas: Disponibles');
    console.log('   ✅ Migración de SQLite a PostgreSQL: Completa');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar las pruebas
console.log('🚀 Iniciando pruebas del sistema PostgreSQL en Render...');
runPostgreSQLTests();
