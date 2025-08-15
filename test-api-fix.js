// test-api-fix.js
const https = require('https');

// Datos para probar creación de producto
const testData = {
  producto_nombre: "Producto Test Fix",
  producto_descripcion: "Descripción de prueba",
  categoria: "Playeras",
  marca: "Test Brand",
  id_sistema_talla: 1,
  variantes: [
    {
      nombre: "Variante Test",
      precio: 29.99,
      imagenes: [
        {
          url: "https://res.cloudinary.com/test/image.jpg",
          public_id: "test/image"
        }
      ],
      tallas: [
        {
          id_talla: 1,
          cantidad: 10
        }
      ]
    }
  ]
};

console.log('🧪 Probando API en Render con los cambios...');

const postData = JSON.stringify(testData);

const options = {
  hostname: 'trebodeluxe-backend.onrender.com',
  port: 443,
  path: '/api/admin/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer test-token' // Token de prueba
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();

console.log('✅ Petición enviada');
