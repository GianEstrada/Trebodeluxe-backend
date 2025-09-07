const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testJSONStructure() {
  const shippingService = new ShippingQuoteService();
  
  console.log('🧪 =======================================');
  console.log('🧪 DEMO: ESTRUCTURA JSON PARA SKYDROPX');
  console.log('🧪 =======================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  // Mock data simulando un carrito real
  const mockCartData = {
    cartItems: [
      {
        id_contenido: 1,
        cantidad: 2,
        id_producto: 4,
        producto_nombre: 'Playera Básica - Negro',
        precio: 350.00,
        id_categoria: 1,
        categoria_nombre: 'Playeras',
        alto_cm: 2.0,
        largo_cm: 30.0,
        ancho_cm: 25.0,
        peso_kg: 0.2,
        nivel_compresion: 0.7,
        id_variante: 1,
        variante_nombre: 'Negro',
        id_talla: 2,
        talla_nombre: 'M'
      },
      {
        id_contenido: 2,
        cantidad: 1,
        id_producto: 5,
        producto_nombre: 'Playera Premium - Blanco',
        precio: 450.00,
        id_categoria: 1,
        categoria_nombre: 'Playeras',
        alto_cm: 2.5,
        largo_cm: 32.0,
        ancho_cm: 26.0,
        peso_kg: 0.25,
        nivel_compresion: 0.6,
        id_variante: 2,
        variante_nombre: 'Blanco',
        id_talla: 3,
        talla_nombre: 'L'
      }
    ]
  };

  try {
    console.log('🔍 ===== DEMOSTRANDO CÁLCULO DE DIMENSIONES =====');
    
    // Simular el cálculo de dimensiones
    const calculatedData = shippingService.calculateShippingDimensions(mockCartData.cartItems);
    
    const fullCartData = {
      cartItems: mockCartData.cartItems,
      ...calculatedData
    };

    console.log('');
    console.log('🔍 ===== DEMOSTRANDO ESTRUCTURA PAYLOAD =====');
    
    // Simular dirección destino
    const mockAddressTo = {
      country_code: "US",
      postal_code: "61422",
      area_level1: "Illinois",
      area_level2: "Granite City", 
      area_level3: "Central"
    };
    
    const mockAddressFrom = {
      country_code: "MX",
      postal_code: "64000",
      area_level1: "Nuevo León",
      area_level2: "Monterrey",
      area_level3: "Monterrey Centro"
    };
    
    // Crear payload como lo haría el servicio real
    const quotationPayload = {
      quotation: {
        order_id: `cart_demo_${Date.now()}`,
        address_from: mockAddressFrom,
        address_to: mockAddressTo,
        parcels: [
          {
            length: Math.ceil(fullCartData.dimensions.length),
            width: Math.ceil(fullCartData.dimensions.width),
            height: Math.ceil(fullCartData.dimensions.height),
            weight: Math.ceil(fullCartData.totalWeight),
            declared_value: Math.ceil(fullCartData.totalValue),
            description: "Cotton clothing items"
          }
        ],
        shipment_type: "package",
        quote_type: "carrier"
      }
    };

    // ==========================================
    // 🔍 LOGS COMO LOS VERÍA EN PRODUCCIÓN
    // ==========================================
    console.log('🔍 ==========================================');
    console.log('🔍 ESTRUCTURA COMPLETA DEL JSON A ENVIAR:');
    console.log('🔍 ==========================================');
    console.log('📦 PAYLOAD COMPLETO:', JSON.stringify(quotationPayload, null, 2));
    console.log('');
    console.log('🔧 ANÁLISIS DETALLADO DE COMPONENTES:');
    console.log('-------------------------------------');
    console.log('📋 ORDER ID:', quotationPayload.quotation.order_id);
    console.log('📍 ADDRESS FROM:', JSON.stringify(quotationPayload.quotation.address_from, null, 2));
    console.log('📍 ADDRESS TO:', JSON.stringify(quotationPayload.quotation.address_to, null, 2));
    console.log('📦 PARCELS:', JSON.stringify(quotationPayload.quotation.parcels, null, 2));
    console.log('🚚 SHIPMENT TYPE:', quotationPayload.quotation.shipment_type);
    console.log('💰 QUOTE TYPE:', quotationPayload.quotation.quote_type);
    console.log('');
    console.log('📊 DATOS DEL CARRITO USADOS:');
    console.log('-------------------------------------');
    console.log('   Items en carrito:', fullCartData.cartItems.length);
    console.log('   Peso total calculado:', fullCartData.totalWeight, 'kg');
    console.log('   Valor total del carrito:', fullCartData.totalValue);
    console.log('   Dimensiones calculadas:', JSON.stringify(fullCartData.dimensions, null, 2));
    console.log('   Factor de compresión:', fullCartData.compressionFactor);
    console.log('🔍 ==========================================');

    console.log('');
    console.log('✅ DEMO COMPLETADO - Esta es la estructura exacta que se envía a SkyDropX');

  } catch (error) {
    console.error('❌ ERROR EN DEMO:', error.message);
    console.error('🔍 Stack:', error.stack);
  }

  console.log('');
  console.log('🧪 =======================================');
  console.log('🧪 DEMO DE ESTRUCTURA JSON COMPLETADO');
  console.log('🧪 =======================================');
}

// Ejecutar demo
testJSONStructure();
