# Script de despliegue para Render (PowerShell)
# Ejecuta este script para actualizar el servidor en Render

Write-Host "🚀 Iniciando despliegue a Render..."

# Comprobar si git está instalado
try {
    git --version | Out-Null
} catch {
    Write-Host "❌ Git no está instalado. Por favor instálalo primero."
    exit 1
}

# Asegurar que estamos en la rama principal
Write-Host "📋 Comprobando rama actual..."
git checkout main

# Añadir cambios
Write-Host "📁 Añadiendo cambios al staging..."
git add .

# Commit
$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "💾 Creando commit..."
git commit -m "Implementación de servidor de autenticación - $fecha"

# Push
Write-Host "📤 Subiendo cambios a GitHub..."
git push origin main

Write-Host "✅ Despliegue completado. Render se actualizará automáticamente."
Write-Host "🔍 Puedes verificar el estado en: https://dashboard.render.com/"
