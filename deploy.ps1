# Script de deployment para el backend de Treboluxe (PowerShell)
# Soluciona el problema de path-to-regexp usando simple-server.js

Write-Host "🚀 Deploying Treboluxe Backend with Loading Screen..." -ForegroundColor Green

# Verificar que estamos en la carpeta correcta
if (-not (Test-Path "simple-server.js")) {
    Write-Host "❌ Error: simple-server.js not found. Are you in the right directory?" -ForegroundColor Red
    exit 1
}

Write-Host "✅ simple-server.js found" -ForegroundColor Green

# Verificar que el servidor funciona localmente
Write-Host "🔍 Testing server locally..." -ForegroundColor Yellow

# Iniciar servidor en background
$ServerJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    node simple-server.js 
}

Start-Sleep -Seconds 3

# Test health check
try {
    $HealthResponse = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
    if ($HealthResponse.status -eq "OK") {
        Write-Host "✅ Health check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check failed" -ForegroundColor Red
        Stop-Job $ServerJob
        Remove-Job $ServerJob
        exit 1
    }
} catch {
    Write-Host "❌ Could not connect to local server" -ForegroundColor Red
    Stop-Job $ServerJob
    Remove-Job $ServerJob
    exit 1
}

# Detener servidor local
Stop-Job $ServerJob
Remove-Job $ServerJob
Write-Host "✅ Local test passed" -ForegroundColor Green

# Mostrar estado de Git
Write-Host "📝 Git status:" -ForegroundColor Yellow
git status

# Commit cambios
$CommitConfirm = Read-Host "¿Quieres hacer commit de los cambios? (y/n)"
if ($CommitConfirm -eq "y" -or $CommitConfirm -eq "Y") {
    git add .
    git commit -m "Fix path-to-regexp error - use simple-server.js for loading screen"
    Write-Host "✅ Changes committed" -ForegroundColor Green
    
    $PushConfirm = Read-Host "¿Quieres hacer push a GitHub? (y/n)"
    if ($PushConfirm -eq "y" -or $PushConfirm -eq "Y") {
        git push origin main
        Write-Host "✅ Changes pushed to GitHub" -ForegroundColor Green
        Write-Host "🎯 Render will auto-deploy using simple-server.js" -ForegroundColor Cyan
    }
} else {
    Write-Host "⏸️  Deployment paused. Run the script again when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Next steps for Render:" -ForegroundColor Cyan
Write-Host "1. Go to your Render dashboard"
Write-Host "2. Check that the build uses: node simple-server.js"
Write-Host "3. Verify health check at: /health"
Write-Host "4. Test loading screen at: /loading"
Write-Host ""
Write-Host "🔗 Expected URLs:" -ForegroundColor Yellow
Write-Host "   Health: https://your-backend.onrender.com/health"
Write-Host "   Loading: https://your-backend.onrender.com/loading"
Write-Host ""
Write-Host "✨ Done! Your backend should now deploy without path-to-regexp errors." -ForegroundColor Green
