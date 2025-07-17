#!/bin/bash

# Script de deployment para el backend de Treboluxe
# Soluciona el problema de path-to-regexp usando simple-server.js

echo "🚀 Deploying Treboluxe Backend with Loading Screen..."

# Verificar que estamos en la carpeta correcta
if [ ! -f "simple-server.js" ]; then
    echo "❌ Error: simple-server.js not found. Are you in the right directory?"
    exit 1
fi

echo "✅ simple-server.js found"

# Verificar que el servidor funciona localmente
echo "🔍 Testing server locally..."
node simple-server.js &
SERVER_PID=$!
sleep 3

# Test health check
HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $SERVER_PID
    exit 1
fi

# Detener servidor local
kill $SERVER_PID
echo "✅ Local test passed"

# Commit y push cambios
echo "📝 Committing changes..."
git add .
git status

read -p "¿Quieres hacer commit de los cambios? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Fix path-to-regexp error - use simple-server.js for loading screen"
    echo "✅ Changes committed"
    
    read -p "¿Quieres hacer push a GitHub? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin main
        echo "✅ Changes pushed to GitHub"
        echo "🎯 Render will auto-deploy using simple-server.js"
    fi
else
    echo "⏸️  Deployment paused. Run the script again when ready."
fi

echo ""
echo "📋 Next steps for Render:"
echo "1. Go to your Render dashboard"
echo "2. Check that the build uses: node simple-server.js"
echo "3. Verify health check at: /health"
echo "4. Test loading screen at: /loading"
echo ""
echo "🔗 Expected URLs:"
echo "   Health: https://your-backend.onrender.com/health"
echo "   Loading: https://your-backend.onrender.com/loading"
echo ""
echo "✨ Done! Your backend should now deploy without path-to-regexp errors."
