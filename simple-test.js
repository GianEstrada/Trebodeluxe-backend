const fetch = require('node-fetch');

async function testRegister() {
  const data = {
    nombres: "Juan Carlos",
    apellidos: "Pérez González",
    usuario: "testuser" + Date.now(),
    correo: "test" + Date.now() + "@test.com",
    contrasena: "password123",
    shippingInfo: {
      nombre_completo: "Juan Carlos Pérez González",
      telefono: "+52 555 123 4567",
      direccion: "Av. Reforma 123",
      ciudad: "Ciudad de México",
      estado: "CDMX",
      codigo_postal: "06000",
      pais: "México"
    }
  };

  try {
    console.log('Probando registro...');
    const response = await fetch('https://trebodeluxe-backend.onrender.com/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRegister();
