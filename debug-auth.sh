#!/bin/bash
# Este script modifica el servidor auth-server.js para revisar las rutas de autenticación

# Detener cualquier servidor node que esté corriendo
echo "📋 Deteniendo servidores Node.js activos..."
killall node 2>/dev/null || echo "No hay servidores Node.js activos"

# Iniciar el servidor con logging extra para depuración
echo "🚀 Iniciando servidor de autenticación con logging extra..."
NODE_DEBUG=http,net node auth-server.js
