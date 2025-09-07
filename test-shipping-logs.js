#!/usr/bin/env node

/**
 * Script de prueba para verificar logs detallados del servicio de cotizaciones
 * Ejecutar: node test-shipping-logs.js
 */

require('dotenv').config();
const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testShippingWithLogs() {
  console.log('🚀 Iniciando prueba de cotizaciones con logs detallados...');
  console.log('📅 Fecha/Hora:', new Date().toISOString());
  console.log('🌐 Entorno:', process.env.NODE_ENV || 'development');
  
  // Verificar variables de entorno
  console.log('\n🔧 VERIFICACIÓN DE VARIABLES DE ENTORNO:');
  console.log('- SKYDROP_API_KEY:', process.env.SKYDROP_API_KEY ? `${process.env.SKYDROP_API_KEY.substring(0, 10)}...` : 'NO DEFINIDA');
  console.log('- SKYDROP_API_SECRET:', process.env.SKYDROP_API_SECRET ? `${process.env.SKYDROP_API_SECRET.substring(0, 10)}...` : 'NO DEFINIDA');
  console.log('- SKYDROP_BASE_URL:', process.env.SKYDROP_BASE_URL || 'https://pro.skydropx.com/api/v1 (default)');
  
  const shippingService = new ShippingQuoteService();
  
  try {
    console.log('\n📦 INICIANDO PRUEBA DE COTIZACIÓN...');
    console.log('- Carrito de prueba: 6');
    console.log('- Código postal destino: 66058');
    
    const startTime = Date.now();
    
    const result = await shippingService.getShippingQuote('6', '66058');
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('\n⏱️ TIEMPO DE RESPUESTA:', `${responseTime}ms`);
    console.log('\n✅ RESULTADO FINAL:');
    console.log('- Success:', result.success);
    
    if (result.success) {
      console.log('- Cotizaciones obtenidas:', result.quotations ? 'SÍ' : 'NO');
      console.log('- Datos del carrito:', JSON.stringify(result.cartData, null, 2));
      
      if (result.quotations) {
        console.log('\n📊 ESTRUCTURA DE COTIZACIONES:');
        console.log('- Tipo:', typeof result.quotations);
        console.log('- Es Array:', Array.isArray(result.quotations));
        
        if (typeof result.quotations === 'object') {
          console.log('- Keys principales:', Object.keys(result.quotations));
        }
        
        console.log('\n📋 COTIZACIONES COMPLETAS:');
        console.log(JSON.stringify(result.quotations, null, 2));
      }
    } else {
      console.log('- Error:', result.error);
      console.log('- Detalles:', JSON.stringify(result.details, null, 2));
      console.log('- Status Code:', result.statusCode);
      
      if (result.requestPayload) {
        console.log('\n📤 PAYLOAD ENVIADO:');
        console.log(JSON.stringify(result.requestPayload, null, 2));
      }
    }
    
  } catch (error) {
    console.error('\n💥 ERROR CRÍTICO EN LA PRUEBA:');
    console.error('- Mensaje:', error.message);
    console.error('- Stack:', error.stack);
  }
  
  console.log('\n🏁 Prueba completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testShippingWithLogs()
    .then(() => {
      console.log('\n✅ Script finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = testShippingWithLogs;
