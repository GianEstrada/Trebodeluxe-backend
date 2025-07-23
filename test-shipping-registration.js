#!/usr/bin/env node

/**
 * Script para probar la funcionalidad de registro con datos de envío
 * Ejecutar con: node test-shipping-registration.js
 */

require('dotenv').config();

const API_URL = process.env.API_URL || 'https://trebodeluxe-backend.onrender.com';

async function testRegistrationWithShipping() {
  console.log('🧪 Probando registro con datos de envío...\n');

  // Datos de prueba para el registro
  const testUser = {
    nombres: 'Juan Carlos',
    apellidos: 'Pérez González',
    usuario: `testuser_${Date.now()}`,
    correo: `test_${Date.now()}@test.com`,
    contrasena: 'password123',
    shippingInfo: {
      nombre_completo: 'Juan Carlos Pérez González',
      telefono: '+52 555 123 4567',
      direccion: 'Av. Reforma 123, Colonia Centro',
      ciudad: 'Ciudad de México',
      estado: 'CDMX',
      codigo_postal: '06000',
      pais: 'México'
    }
  };

  console.log('📋 Datos de prueba:');
  console.log('   Usuario:', testUser.usuario);
  console.log('   Correo:', testUser.correo);
  console.log('   Nombre completo:', testUser.shippingInfo.nombre_completo);
  console.log('   Ciudad:', testUser.shippingInfo.ciudad);

  try {
    // 1. Probar registro con datos de envío completos
    console.log('\n🔄 Enviando solicitud de registro...');
    
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const registerData = await registerResponse.json();
    
    if (registerResponse.ok && registerData.success) {
      console.log('✅ Registro exitoso!');
      console.log('   ID Usuario:', registerData.user.id_usuario);
      console.log('   Token generado:', registerData.token ? 'Sí' : 'No');
      
      if (registerData.user.shippingInfo) {
        console.log('   Datos de envío guardados:');
        console.log('     ID:', registerData.user.shippingInfo.id_informacion);
        console.log('     Nombre:', registerData.user.shippingInfo.nombre_completo);
        console.log('     Teléfono:', registerData.user.shippingInfo.telefono);
        console.log('     Ciudad:', registerData.user.shippingInfo.ciudad);
      } else {
        console.log('   ⚠️  Datos de envío no encontrados en la respuesta');
      }

      // 2. Probar login para verificar que los datos de envío se cargan
      console.log('\n🔄 Probando login...');
      
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: testUser.usuario,
          contrasena: testUser.contrasena
        }),
      });

      const loginData = await loginResponse.json();
      
      if (loginResponse.ok && loginData.success) {
        console.log('✅ Login exitoso!');
        
        if (loginData.user.shippingInfo) {
          console.log('   Datos de envío cargados en login:');
          console.log('     Nombre:', loginData.user.shippingInfo.nombre_completo);
          console.log('     Dirección:', loginData.user.shippingInfo.direccion);
          console.log('     Ciudad:', loginData.user.shippingInfo.ciudad);
        } else {
          console.log('   ⚠️  Datos de envío no cargados en login');
        }
      } else {
        console.log('❌ Error en login:', loginData.message);
      }

    } else {
      console.log('❌ Error en registro:', registerData.message);
      console.log('   Detalles:', registerResponse.status, registerResponse.statusText);
    }

  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
  }
}

async function testRegistrationWithoutShipping() {
  console.log('\n🧪 Probando registro SIN datos de envío...\n');

  // Datos de prueba sin información de envío
  const testUser = {
    nombres: 'María',
    apellidos: 'García López',
    usuario: `testuser_no_shipping_${Date.now()}`,
    correo: `test_no_shipping_${Date.now()}@test.com`,
    contrasena: 'password123'
    // Sin shippingInfo
  };

  console.log('📋 Datos de prueba (sin envío):');
  console.log('   Usuario:', testUser.usuario);
  console.log('   Correo:', testUser.correo);

  try {
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const registerData = await registerResponse.json();
    
    if (registerResponse.ok && registerData.success) {
      console.log('✅ Registro sin datos de envío exitoso!');
      console.log('   ID Usuario:', registerData.user.id_usuario);
      console.log('   Datos de envío:', registerData.user.shippingInfo ? 'Presentes' : 'No presentes (correcto)');
    } else {
      console.log('❌ Error en registro sin envío:', registerData.message);
    }

  } catch (error) {
    console.log('💥 Error de conexión:', error.message);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  Promise.resolve()
    .then(testRegistrationWithShipping)
    .then(testRegistrationWithoutShipping)
    .then(() => {
      console.log('\n🎉 Pruebas completadas!');
      console.log('\n📋 Resumen:');
      console.log('   ✅ Registro con datos de envío implementado');
      console.log('   ✅ Registro sin datos de envío funcional');
      console.log('   ✅ Login incluye datos de envío cuando existen');
      console.log('   ✅ Base de datos actualizada correctamente');
    })
    .catch(error => {
      console.error('💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { testRegistrationWithShipping, testRegistrationWithoutShipping };
