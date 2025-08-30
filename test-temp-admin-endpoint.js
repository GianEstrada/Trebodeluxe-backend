// Test endpoint temporal admin sin auth

async function testTempEndpoint() {
  try {
    console.log('🔍 Probando endpoint temporal admin...');
    
    const https = require('https');
    const url = 'https://trebodeluxe-backend.onrender.com/api/categorias/admin-temp';
    
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
            reject(new Error('Invalid JSON response: ' + body.substring(0, 200)));
          }
        });
      }).on('error', reject);
    });

    console.log('📊 Status:', data.status);
    console.log('📊 Success:', data.data.success);
    
    if (data.data.success && data.data.categorias) {
      console.log('📊 Total categorías:', data.data.categorias.length);
      console.log('📊 SkyDropX Status:', data.data.skydropx_columns_status);
      console.log('📊 Endpoint temporal:', data.data.temp_endpoint);
      
      if (data.data.categorias.length > 0) {
        console.log('📋 Primera categoría:');
        const first = data.data.categorias[0];
        console.log(`   - ID: ${first.id_categoria}`);
        console.log(`   - Nombre: ${first.nombre}`);
        console.log(`   - Descripción: ${first.descripcion}`);
        console.log(`   - Activo: ${first.activo}`);
        console.log(`   - SkyDropX: alto=${first.alto_cm}, largo=${first.largo_cm}, peso=${first.peso_kg}`);
        console.log(`   - Productos: ${first.productos_count}`);
      }
    } else {
      console.log('❌ El endpoint no devolvió datos válidos');
      console.log('📋 Respuesta:', JSON.stringify(data.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error al probar endpoint temporal:', error.message);
  }
}

testTempEndpoint();
