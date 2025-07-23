#!/usr/bin/env node

/**
 * Script para verificar la configuración de Cloudinary
 * Ejecutar con: node verify-cloudinary-setup.js
 */

require('dotenv').config();

const { cloudinary, uploadImage, deleteImage } = require('./src/config/cloudinary');
const fs = require('fs');
const path = require('path');

async function verifyCloudinarySetup() {
  console.log('🔍 Verificando configuración de Cloudinary...\n');
  
  // 1. Verificar variables de entorno
  console.log('📋 Variables de entorno:');
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
    } else {
      console.log(`❌ ${varName}: No definida`);
    }
  }
  
  // 2. Verificar conexión a Cloudinary
  console.log('\n🔗 Probando conexión con Cloudinary...');
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Conexión exitosa:', result);
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return false;
  }
  
  // 3. Verificar carpeta de uploads
  console.log('\n📂 Verificando directorio de uploads...');
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Creando directorio uploads...');
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  console.log('✅ Directorio uploads existe');
  
  // 4. Crear imagen de prueba
  console.log('\n🖼️ Creando imagen de prueba...');
  const testImagePath = path.join(uploadsDir, 'test-image.png');
  
  if (!fs.existsSync(testImagePath)) {
    // Crear una imagen PNG básica de 1x1 pixel
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, 
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x92, 0x00, 0x00, 0x00, 0x00, 0x49, 
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(testImagePath, pngData);
  }
  
  // 5. Probar subida de imagen
  console.log('☁️ Probando subida de imagen...');
  try {
    const uploadResult = await uploadImage(testImagePath, 'test');
    console.log('✅ Imagen subida exitosamente:');
    console.log(`   URL: ${uploadResult.url}`);
    console.log(`   Public ID: ${uploadResult.public_id}`);
    
    // 6. Probar eliminación de imagen
    console.log('\n🗑️ Probando eliminación de imagen...');
    const deleteResult = await deleteImage(uploadResult.public_id);
    console.log('✅ Imagen eliminada exitosamente:', deleteResult);
    
  } catch (error) {
    console.log('❌ Error en prueba de subida:', error.message);
    return false;
  }
  
  // 7. Limpiar archivo de prueba
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
    console.log('🧹 Archivo de prueba eliminado');
  }
  
  console.log('\n🎉 ¡Configuración de Cloudinary verificada exitosamente!');
  console.log('\n📋 Resumen:');
  console.log('   ✅ Variables de entorno configuradas');
  console.log('   ✅ Conexión a Cloudinary establecida');
  console.log('   ✅ Directorio uploads configurado');
  console.log('   ✅ Subida de imágenes funcional');
  console.log('   ✅ Eliminación de imágenes funcional');
  
  return true;
}

// Ejecutar verificación
if (require.main === module) {
  verifyCloudinarySetup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error inesperado:', error);
      process.exit(1);
    });
}

module.exports = { verifyCloudinarySetup };
