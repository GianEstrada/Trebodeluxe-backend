#!/bin/bash

# Crear carpeta de distribución
echo "Creando carpeta de distribución..."
mkdir -p dist

# Copiar archivos principales
echo "Copiando archivos principales..."
cp package.json dist/
cp simple-server.js dist/

# Copiar carpetas del código fuente
echo "Copiando código fuente..."
cp -r src dist/
cp -r config dist/

# Instalar dependencias
echo "Instalando dependencias..."
cd dist
npm install --production

echo "Build completado. Los archivos están listos para el despliegue."
