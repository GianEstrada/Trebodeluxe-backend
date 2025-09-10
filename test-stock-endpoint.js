/**
 * SCRIPT PARA PROBAR EL ENDPOINT COMPLETO DE STOCK POR VARIANTE
 */

const fetch = require('node-fetch');

async function testStockEndpoint() {
  try {
    console.log('🚀 Iniciando servidor de backend...\n');
    
    // Necesitamos esperar a que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🧪 Probando nuevo endpoint: GET /api/products/variants/:variantId/stock');
    console.log('===============================================================\n');
    
    // Probar con variante Verde (ID: 14)
    console.log('📗 PRUEBA 1: Variante Verde (ID: 14)');
    try {
      const response1 = await fetch('http://localhost:5000/api/products/variants/14/stock');
      const data1 = await response1.json();
      
      console.log('✅ Respuesta exitosa:');
      console.log(JSON.stringify(data1, null, 2));
      
      if (data1.success && data1.data.tallas_stock) {
        console.log('\n📊 Stock detallado para Verde:');
        data1.data.tallas_stock.forEach(talla => {
          console.log(`   ${talla.nombre_talla}: ${talla.cantidad} unidades - $${talla.precio}`);
        });
      }
    } catch (error) {
      console.log('❌ Error probando variante Verde:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Probar con variante Negra (ID: 18)
    console.log('📘 PRUEBA 2: Variante Negra (ID: 18)');
    try {
      const response2 = await fetch('http://localhost:5000/api/products/variants/18/stock');
      const data2 = await response2.json();
      
      console.log('✅ Respuesta exitosa:');
      console.log(JSON.stringify(data2, null, 2));
      
      if (data2.success && data2.data.tallas_stock) {
        console.log('\n📊 Stock detallado para Negra:');
        data2.data.tallas_stock.forEach(talla => {
          console.log(`   ${talla.nombre_talla}: ${talla.cantidad} unidades - $${talla.precio}`);
        });
      }
    } catch (error) {
      console.log('❌ Error probando variante Negra:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Probar con variante inexistente
    console.log('🧪 PRUEBA 3: Variante inexistente (ID: 999)');
    try {
      const response3 = await fetch('http://localhost:5000/api/products/variants/999/stock');
      const data3 = await response3.json();
      
      console.log('📋 Respuesta para variante inexistente:');
      console.log(JSON.stringify(data3, null, 2));
    } catch (error) {
      console.log('❌ Error probando variante inexistente:', error.message);
    }
    
    console.log('\n✅ PRUEBAS COMPLETADAS');
    console.log('======================');
    console.log('🔧 Próximo paso: Modificar frontend para usar esta API');
    console.log('📱 Ubicación: pages/producto/[id].tsx - función handleVariantChange');
    console.log('🎯 Objetivo: Actualizar stock display cuando cambie la variante');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Verificar si el servidor está corriendo
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    
    if (data.status === 'OK') {
      console.log('✅ Servidor de backend está corriendo');
      return true;
    } else {
      console.log('⚠️  Servidor responde pero con problemas');
      return false;
    }
  } catch (error) {
    console.log('❌ Servidor no está corriendo en puerto 5000');
    console.log('💡 Ejecuta: npm start en el directorio backend');
    return false;
  }
}

async function main() {
  console.log('🔍 Verificando estado del servidor...\n');
  
  const serverOk = await checkServerHealth();
  
  if (serverOk) {
    await testStockEndpoint();
  } else {
    console.log('\n❌ No se pueden ejecutar las pruebas sin el servidor');
    console.log('📋 Para iniciar el servidor:');
    console.log('   1. cd E:\\Trebodeluxe\\Trebodeluxe-backend');
    console.log('   2. npm start');
    console.log('   3. Ejecutar este script nuevamente');
  }
}

main();
