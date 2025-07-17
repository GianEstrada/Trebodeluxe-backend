# 🚨 Solución al Error path-to-regexp en Render

## Problema
```
TypeError: Missing parameter name at 1: https://git.new/pathToRegexpError
```

Este error ocurre por incompatibilidades entre versiones de Express y path-to-regexp.

## ✅ Solución Implementada

Hemos creado un **servidor simple** (`simple-server.js`) que:
- ✅ No usa Express (solo HTTP nativo de Node.js)
- ✅ No tiene dependencias externas problemáticas
- ✅ Incluye todas las funcionalidades necesarias
- ✅ Es más liviano y rápido

## 🔧 Archivos Actualizados

### 1. `package.json`
```json
{
  "main": "simple-server.js",
  "scripts": {
    "start": "node simple-server.js",
    "loading": "node simple-server.js",
    "api": "node server.js"
  }
}
```

### 2. `render.yaml`
```yaml
services:
  - type: web
    name: treboluxe-backend
    env: node
    buildCommand: echo "No build needed for simple server"
    startCommand: node simple-server.js
    healthCheckPath: /health
```

## 🚀 Deploy en Render

### Opción 1: Re-deploy Automático
1. Haz commit de los cambios
2. Push al repositorio
3. Render detectará los cambios automáticamente
4. Usará `node simple-server.js` en lugar de `node server.js`

### Opción 2: Deploy Manual
1. Ve al dashboard de Render
2. Selecciona tu servicio backend
3. Ve a "Settings" → "Build & Deploy"
4. Cambia el "Start Command" a: `node simple-server.js`
5. Deploy manual

### Opción 3: Nuevo Servicio
Si sigues teniendo problemas:
1. Crea un nuevo Web Service en Render
2. Conecta el mismo repositorio
3. Configuración:
   ```
   Build Command: echo "No build needed"
   Start Command: node simple-server.js
   ```

## 🔍 Verificación

Una vez deployado, verifica:
- Health check: `https://tu-backend.onrender.com/health`
- Loading screen: `https://tu-backend.onrender.com/loading`
- Frontend status: `https://tu-backend.onrender.com/api/frontend-status`

## 📝 Logs de Render

Si el deploy falla, revisa los logs:
1. Ve al dashboard de Render
2. Selecciona tu servicio
3. Ve a "Logs"
4. Busca errores en el startup

## 🆘 Si el Problema Persiste

### Limpiar completamente:
```bash
# En Render dashboard
1. Delete el servicio actual
2. Crear nuevo servicio
3. Usar simple-server.js desde el inicio
```

### Variables de entorno requeridas:
```
NODE_ENV=production
FRONTEND_URL=https://trebodeluxe-front.onrender.com
```

## 🎯 Diferencias entre Servidores

| Característica | `server.js` | `simple-server.js` |
|---|---|---|
| Dependencias | Express, CORS, etc. | Solo Node.js nativo |
| Tamaño | ~500+ líneas | ~200 líneas |
| Problemas | path-to-regexp error | ✅ Sin problemas |
| API completa | ✅ Sí | ❌ Solo loading |
| Pantalla de carga | ✅ Sí | ✅ Sí |
| Health checks | ✅ Sí | ✅ Sí |

## 💡 Recomendación

Para **producción de la pantalla de carga**: Usa `simple-server.js`
Para **desarrollo de API completa**: Usa `server.js` localmente

## 🔄 Comandos Útiles

```bash
# Localmente - servidor simple
npm run loading

# Localmente - servidor completo (para desarrollo)
npm run api

# Producción en Render
npm start  # → ejecuta simple-server.js
```
