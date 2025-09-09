// debug-skydropx-params.js - Script para verificar parámetros SkyDropX
const skyDropXService = require('./src/services/skydropx.service.js');

async function debugOrderCreation() {
  console.log('🔍 [DEBUG] Iniciando prueba de parámetros SkyDropX...');
  
  // Simular datos de orden como los que envía el controlador
  const testOrderData = {
    orderId: 3,
    referenceNumber: '1x7T7Bwa6UbgJEm',
    paymentStatus: 'pending',
    totalPrice: 829.00,
    shippingInfo: {
      nombre_completo: 'Gian Karlo Jocsan',
      telefono: '8181234567',
      direccion: 'Test Address 123',
      ciudad: 'Monterrey',
      estado: 'Nuevo León',
      codigo_postal: '66058',
      pais: 'MX',
      correo: 'test@example.com'
    },
    cartItems: [
      {
        id_producto: 5,
        id_variante: null,
        id_talla: null,
        cantidad: 1,
        precio_unitario: 829,
        producto_nombre: 'Test Product',
        categoria: 'general',
        peso_gramos: 100
      }
    ]
  };
  
  console.log('📦 [DEBUG] Datos de prueba preparados:', JSON.stringify(testOrderData, null, 2));
  
  try {
    console.log('🚀 [DEBUG] Intentando crear orden en SkyDropX...');
    const result = await skyDropXService.createOrder(testOrderData);
    console.log('✅ [DEBUG] Resultado:', result);
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error.message);
    console.error('📋 [DEBUG] Stack trace:', error.stack);
  }
}

debugOrderCreation().catch(console.error);
