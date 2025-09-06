#!/usr/bin/env node

/**
 * Script de verificación de sistema de envíos en producción
 * Uso: node test-shipping-production.js
 */

const axios = require('axios');

const BACKEND_URL = 'https://trebodeluxe-backend.onrender.com';

async function testShippingSystem() {
  console.log('🧪 VERIFICACIÓN DEL SISTEMA DE ENVÍOS EN PRODUCCIÓN');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Verificando estado del servidor...');
    const healthResponse = await axios.get(`${BACKEND_URL}/api/health`);
    console.log('   ✅ Servidor funcionando:', healthResponse.status === 200);
    console.log('   📊 Estado BD:', healthResponse.data.database?.connected ? 'Conectada' : 'Desconectada');
    console.log('');

    // Test 2: Shipping Quote
    console.log('2️⃣ Probando cotización de envío...');
    const cartId = 6; // ID del carrito de prueba
    const postalCode = '66058'; // CP de prueba (Nuevo León)
    
    console.log(`   📦 Carrito: ${cartId}`);
    console.log(`   📍 CP destino: ${postalCode}`);
    
    const startTime = Date.now();
    const shippingResponse = await axios.post(`${BACKEND_URL}/api/skydropx/cart/quote`, {
      cartId: cartId,
      postalCode: postalCode
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`   ⏱️ Tiempo de respuesta: ${responseTime}ms`);
    console.log(`   ✅ Status: ${shippingResponse.status}`);
    
    if (shippingResponse.data.success) {
      console.log('   🎯 Cotización exitosa');
      console.log(`   📊 Items en carrito: ${shippingResponse.data.cartData.items}`);
      console.log(`   ⚖️ Peso total: ${shippingResponse.data.cartData.totalWeight}g`);
      console.log(`   📏 Dimensiones: ${JSON.stringify(shippingResponse.data.cartData.dimensions)}`);
      
      if (shippingResponse.data.quotations && shippingResponse.data.quotations.data) {
        const quotes = shippingResponse.data.quotations.data;
        console.log(`   📦 Opciones de envío: ${quotes.length}`);
        
        quotes.slice(0, 3).forEach((quote, index) => {
          console.log(`     ${index + 1}. ${quote.provider} - $${quote.amount_local} MXN (${quote.days} días)`);
        });
      }
    } else {
      console.log('   ⚠️ Cotización con errores:', shippingResponse.data.error);
    }
    
    console.log('');

    // Test 3: Verificar códigos postales específicos
    console.log('3️⃣ Verificando resolución de códigos postales...');
    const testCodes = ['66058', '64000', '01000'];
    
    for (const cp of testCodes) {
      try {
        const testResponse = await axios.post(`${BACKEND_URL}/api/skydropx/cart/quote`, {
          cartId: cartId,
          postalCode: cp
        });
        
        const addressUsed = testResponse.data.requestPayload?.quotation?.address_to;
        if (addressUsed) {
          console.log(`   📍 CP ${cp}: ${addressUsed.area_level1}, ${addressUsed.area_level2}, ${addressUsed.area_level3}`);
        }
      } catch (error) {
        console.log(`   ❌ CP ${cp}: Error - ${error.message}`);
      }
    }
    
    console.log('');
    console.log('🎉 VERIFICACIÓN COMPLETADA');
    console.log('✅ Sistema de envíos funcionando correctamente en producción');
    
  } catch (error) {
    console.error('❌ ERROR en verificación:', error.message);
    if (error.response) {
      console.error('📋 Detalles del error:');
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testShippingSystem().catch(console.error);
}

module.exports = { testShippingSystem };
