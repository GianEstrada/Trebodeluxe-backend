// Test simple para verificar endpoint público de categorías

async function testPublicEndpoint() {
  try {
    console.log('🔍 Probando endpoint público de categorías...');
    
    // Simulamos una llamada HTTP simple
    const https = require('https');
    const url = 'https://trebodeluxe-backend.onrender.com/api/categorias';
    
    const data = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({
              status: res.statusCode,
              data: parsed
            });
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      }).on('error', reject);
    });

    console.log('📊 Status:', data.status);
    console.log('📊 Success:', data.data.success);
    
    if (data.data.success && data.data.categorias) {
      console.log('📊 Total categorías:', data.data.categorias.length);
      
      if (data.data.categorias.length > 0) {
        console.log('📋 Primera categoría:');
        const first = data.data.categorias[0];
        console.log(`   - ID: ${first.id_categoria}`);
        console.log(`   - Nombre: ${first.nombre}`);
        console.log(`   - Activo: ${first.activo}`);
      } else {
        console.log('⚠️ No hay categorías activas en la respuesta');
      }
    } else {
      console.log('❌ El endpoint no devolvió datos válidos');
      console.log('📋 Respuesta:', JSON.stringify(data.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error al probar endpoint:', error.message);
  }
}

testPublicEndpoint();
