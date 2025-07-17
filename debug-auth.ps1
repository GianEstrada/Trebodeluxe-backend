# Script de depuración para el servidor de autenticación (PowerShell)

Write-Host "📋 Deteniendo servidores Node.js activos..."
Stop-Process -Name "node" -ErrorAction SilentlyContinue
if ($?) {
    Write-Host "Servidores Node.js detenidos exitosamente"
} else {
    Write-Host "No hay servidores Node.js activos para detener"
}

Write-Host "🚀 Iniciando servidor de autenticación con logging extra..."
$env:NODE_DEBUG = "http,net"
node e:\Trebodeluxe\Trebodeluxe-backend\auth-server.js
