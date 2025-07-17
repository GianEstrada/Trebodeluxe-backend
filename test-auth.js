// Script de prueba para el sistema de autenticación
// Ejecutar en la consola del navegador o en Node.js

const API_BASE = 'http://localhost:5000';

// Función helper para hacer requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const result = await response.json();
  
  console.log(`${method} ${endpoint}:`, result);
  return result;
}

// Función helper para requests autenticados
async function makeAuthRequest(endpoint, token, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const result = await response.json();
  
  console.log(`${method} ${endpoint} (Auth):`, result);
  return result;
}

// Pruebas del sistema de autenticación
async function runAuthTests() {
  console.log('🧪 Iniciando pruebas del sistema de autenticación...\n');

  try {
    // 1. Verificar que el servidor está funcionando
    console.log('1️⃣ Verificando estado del servidor...');
    await makeRequest('/health');

    // 2. Probar login con usuario admin
    console.log('\n2️⃣ Probando login con usuario admin...');
    const loginResult = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@treboluxe.com',
      password: 'admin123'
    });

    if (!loginResult.success) {
      console.error('❌ Error en login:', loginResult.error);
      return;
    }

    const { accessToken, refreshToken } = loginResult.tokens;
    console.log('✅ Login exitoso');

    // 3. Verificar token
    console.log('\n3️⃣ Verificando token...');
    await makeRequest('/api/auth/verify', 'POST', {
      token: accessToken
    });

    // 4. Obtener perfil de usuario
    console.log('\n4️⃣ Obteniendo perfil de usuario...');
    await makeAuthRequest('/api/auth/profile', accessToken);

    // 5. Renovar token
    console.log('\n5️⃣ Renovando token...');
    await makeRequest('/api/auth/refresh', 'POST', {
      refreshToken: refreshToken
    });

    // 6. Registrar nuevo usuario
    console.log('\n6️⃣ Registrando nuevo usuario...');
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
    
    if (registerResult.success) {
      console.log('✅ Registro exitoso');
      
      // 7. Login con nuevo usuario
      console.log('\n7️⃣ Login con nuevo usuario...');
      await makeRequest('/api/auth/login', 'POST', {
        email: newUser.email,
        password: newUser.password
      });
    }

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar las pruebas
if (typeof window !== 'undefined') {
  // En el navegador
  console.log('🌐 Ejecutando pruebas en el navegador...');
  runAuthTests();
} else {
  // En Node.js
  console.log('📱 Para ejecutar estas pruebas:');
  console.log('1. Abre la consola del navegador en http://localhost:3000');
  console.log('2. Copia y pega este script');
  console.log('3. O usa fetch desde la consola del navegador');
  console.log('\nEjemplo de login:');
  console.log(`
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@treboluxe.com',
    password: 'admin123'
  })
}).then(r => r.json()).then(console.log);
  `);
}
