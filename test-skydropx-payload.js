// test-skydropx-payload.js - Script para probar la estructura del payload de SkyDropX
// Ejecutar: node test-skydropx-payload.js

const skyDropXService = require('./src/services/skydropx.service');

// Datos de prueba similares a los de tu orden real
const testOrderData = {
  orderId: 999,
  referenceNumber: "TEST_ORDER_123",
  paymentStatus: "pending",
  totalPrice: 892,
  shippingInfo: {
    nombre_completo: "Test User",
    telefono: "8119952616",
    direccion: "Test Address 123",
    ciudad: "Test City",
    estado: "Test State",
    codigo_postal: "66058",
    colonia: "Test Colony",
    referencias: "Test References",
    pais: "MX",
    correo: "test@test.com"
  },
  cartItems: [{
    id_producto: 5,
    id_variante: 14,
    id_talla: 1,
    cantidad: 1,
    precio_unitario: 600,
    producto_nombre: "Test Product",
    categoria: "general",
    peso_gramos: 100
  }],
  shippingMethod: "FedEx Standard Overnight",
  insurance: false
};

async function testPayloadStructure() {
  try {
    console.log('🧪 [TEST] Iniciando prueba de estructura del payload...');
    
    // Probar las funciones helper
    console.log('\n🔧 [TEST] Probando funciones helper:');
    const carrier = skyDropXService.extractCarrierFromShippingMethod(testOrderData.shippingMethod);
    console.log(`📦 Carrier extraído: ${carrier}`);
    
    const declaredValue = skyDropXService.calculateDeclaredValue(testOrderData.totalPrice);
    console.log(`💰 Valor declarado: $${declaredValue}`);
    
    const shouldInsure = skyDropXService.shouldEnableInsurance(testOrderData.totalPrice, testOrderData.insurance);
    console.log(`🛡️ Seguro: ${shouldInsure}`);
    
    console.log('\n📋 [TEST] Estructura del payload que se enviaría:');
    console.log('===============================================');
    
    // Solo crear la estructura del payload sin enviarlo
    const payload = {
      declared_value: declaredValue,
      provider: carrier,
      insurance: shouldInsure,
      content: "Mercancía general",
      delivery_type: 1,
      dangerous_goods: false,
      oversized: false,
      order: {
        reference: testOrderData.referenceNumber,
        reference_number: testOrderData.referenceNumber,
        payment_status: testOrderData.paymentStatus,
        total_price: testOrderData.totalPrice.toString(),
        // ... resto de campos
      }
    };
    
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n✅ [TEST] Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ [TEST] Error en la prueba:', error.message);
  }
}

// Ejecutar la prueba
testPayloadStructure();
