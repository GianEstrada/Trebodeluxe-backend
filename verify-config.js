#!/usr/bin/env node

// Verificar configuración del backend
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración del backend...\n');

// 1. Verificar variables de entorno
console.log('1. Variables de entorno:');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

let envMissing = false;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`   ✅ ${envVar}: Configurada`);
  } else {
    console.log(`   ❌ ${envVar}: FALTA`);
    envMissing = true;
  }
});

// 2. Verificar archivos clave
console.log('\n2. Archivos del proyecto:');
const requiredFiles = [
  'src/controllers/admin.controller.js',
  'src/routes/admin.routes.js',
  'src/config/db.js',
  'src/config/complete_schema_with_promotions.sql'
];

let filesMissing = false;
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file}: Existe`);
  } else {
    console.log(`   ❌ ${file}: FALTA`);
    filesMissing = true;
  }
});

// 3. Verificar conexión a base de datos
console.log('\n3. Conexión a base de datos:');
try {
  const pool = require('./src/config/db');
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.log('   ❌ Error de conexión:', err.message);
    } else {
      console.log('   ✅ Conexión exitosa');
    }
    
    // Resumen final
    console.log('\n📋 RESUMEN:');
    if (envMissing) {
      console.log('❌ Faltan variables de entorno. Revisa tu archivo .env');
      console.log('💡 Usa .env.example como referencia');
    }
    
    if (filesMissing) {
      console.log('❌ Faltan archivos del proyecto');
    }
    
    if (!envMissing && !filesMissing) {
      console.log('🎉 ¡Todo configurado correctamente!');
      console.log('🚀 Puedes ejecutar: npm start');
    }
    
    process.exit(envMissing || filesMissing ? 1 : 0);
  });
} catch (error) {
  console.log('   ❌ Error cargando configuración DB:', error.message);
  process.exit(1);
}
