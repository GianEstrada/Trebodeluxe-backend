// Test script para probar el login del frontend
const API_URL = 'http://localhost:5000';

async function testFrontendLogin() {
  try {
    console.log('🚀 Probando login frontend...\n');

    const loginData = {
      usuario: 'admin',
      contrasena: 'admin123'
    };

    console.log('1. Enviando datos de login:', loginData);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    console.log('2. Status de respuesta:', response.status);

    const result = await response.json();
    console.log('3. Respuesta completa:', JSON.stringify(result, null, 2));

    if (result.success) {
      const userData = {
        ...result.user,
        token: result.token
      };
      
      console.log('4. Datos del usuario que se guardarían:', JSON.stringify(userData, null, 2));
      
      // Verificar el rol específicamente
      console.log('5. Rol del usuario:', userData.rol);
      console.log('6. Tipo del rol:', typeof userData.rol);
      console.log('7. Es admin?:', userData.rol === 'admin');
      console.log('8. Es admin (número)?:', userData.rol === 1);
      
    } else {
      console.log('❌ Error en login:', result.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFrontendLogin();
