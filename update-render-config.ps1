# Script para actualizar render.yaml (PowerShell)

Write-Host "📋 Actualizando configuración de Render..."

# Contenido del nuevo render.yaml
$content = @"
services:
  - type: web
    name: treboluxe-backend
    env: node
    buildCommand: echo "No build needed for auth server"
    startCommand: node auth-test-server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: FRONTEND_URL
        value: https://trebodeluxe-front.onrender.com
    healthCheckPath: /health
    plan: free
"@

# Escribir el nuevo contenido
$content | Out-File -FilePath "e:\Trebodeluxe\Trebodeluxe-backend\render.yaml" -Encoding utf8

Write-Host "✅ Configuración actualizada para usar auth-test-server.js"
Write-Host "🚀 Ejecuta deploy-auth.ps1 para aplicar los cambios en Render"
