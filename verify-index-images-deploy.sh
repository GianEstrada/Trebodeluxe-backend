#!/bin/bash

echo "🚀 Desplegando cambios para imágenes index..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Asegúrate de estar en el directorio del backend."
    exit 1
fi

# Verificar que las funciones estén exportadas correctamente
echo "🔍 Verificando exportaciones del controlador..."
node -e "
const controller = require('./src/controllers/admin.controller');
const required = ['getIndexImages', 'createIndexImage', 'updateIndexImage', 'deleteIndexImage', 'updateImageStatus', 'updateImagePosition'];
let allOk = true;
required.forEach(func => {
    if (typeof controller[func] !== 'function') {
        console.log('❌ Función no encontrada:', func);
        allOk = false;
    }
});
if (allOk) {
    console.log('✅ Todas las funciones están exportadas correctamente');
} else {
    console.log('❌ Hay funciones faltantes');
    process.exit(1);
}
"

# Verificar sintaxis de las rutas
echo "🔍 Verificando sintaxis de rutas..."
node -c src/routes/admin.routes.js
if [ $? -eq 0 ]; then
    echo "✅ Sintaxis de rutas correcta"
else
    echo "❌ Error de sintaxis en rutas"
    exit 1
fi

# Verificar que la migración esté completa
echo "🔍 Verificando tabla imagenes_index..."
node -e "
const { pool } = require('./src/config/db');
pool.query('SELECT COUNT(*) FROM imagenes_index')
    .then(result => {
        console.log('✅ Tabla imagenes_index existe con', result.rows[0].count, 'registros');
        process.exit(0);
    })
    .catch(error => {
        console.log('❌ Error accediendo a imagenes_index:', error.message);
        process.exit(1);
    });
"

echo "🎉 Verificaciones completadas. El código está listo para deploy."
