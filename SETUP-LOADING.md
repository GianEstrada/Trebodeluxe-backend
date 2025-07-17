# Setup de Pantalla de Carga con Backend y Frontend Separados

Este setup permite que el backend sirva una pantalla de carga mientras el frontend se activa desde el modo sleep de Render.

## Arquitectura

```
Usuario → Backend (siempre activo) → Pantalla de Carga → Frontend (se activa automáticamente)
```

## Ventajas

- ✅ **Backend siempre disponible**: El usuario nunca ve un error 503
- ✅ **Ahorro de recursos**: El frontend puede usar auto-sleep
- ✅ **Mejor UX**: Experiencia de carga profesional
- ✅ **Branding consistente**: Mantiene la identidad visual
- ✅ **Detección automática**: Redirige cuando está listo

## Setup en Render

### 1. Backend (Servidor de Carga)

1. **Crear nuevo Web Service en Render**
2. **Configuración**:
   - Repository: Tu repo del backend
   - Build Command: `echo "No build needed"`
   - Start Command: `node simple-server.js`
   - Plan: Starter (para que no entre en sleep)
   - Auto-Deploy: Manual

3. **Variables de entorno**:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://tu-frontend-url.onrender.com
   ```

4. **Health Check**: `/health`

### 2. Frontend (Aplicación Principal)

1. **Configuración normal de Next.js**
2. **Puede usar Plan Free** (con auto-sleep)
3. **Auto-Deploy**: Automático desde Git

### 3. DNS/Dominio

- **Dominio principal** apunta al **Backend** (servidor de carga)
- El backend se encarga de detectar y redirigir al frontend

## Archivos Importantes

### Backend
- `simple-server.js` - Servidor HTTP simple sin dependencias
- `public/loading.html` - Pantalla de carga con CSS y JS incluido
- `package-loading.json` - Package.json minimalista
- `render-loading.yaml` - Configuración para Render

### Frontend
- `pages/api/health.ts` - Endpoint de health check

## Flujo de Funcionamiento

1. **Usuario accede** a tu dominio principal
2. **Backend responde** inmediatamente con la pantalla de carga
3. **JavaScript verifica** cada 2 segundos si el frontend está listo
4. **Render activa** el frontend automáticamente al detectar tráfico
5. **Redirección automática** una vez que el frontend responde
6. **Usuario ve** la aplicación principal

## Testing Local

```bash
# 1. Iniciar backend de carga
cd Trebodeluxe-backend
node simple-server.js

# 2. Abrir navegador
# http://localhost:5000

# 3. Debería ver la pantalla de carga
```

## Personalización

### Cambiar URLs
En `public/loading.html`, línea ~170:
```javascript
const FRONTEND_URL = 'https://tu-frontend-url.onrender.com';
```

### Personalizar mensajes
En `public/loading.html`, línea ~180:
```javascript
const messages = [
    'Tu mensaje personalizado...',
    'Segundo mensaje...',
    // ...
];
```

### Cambiar estilos
Editar el CSS en `public/loading.html` dentro del tag `<style>`

### Ajustar timeouts
```javascript
const MAX_RETRIES = 30;        // Máximo 60 segundos
const RETRY_INTERVAL = 2000;   // Verificar cada 2 segundos
```

## Monitoreo

### Backend
- Health check: `https://tu-backend.onrender.com/health`
- Status del frontend: `https://tu-backend.onrender.com/api/frontend-status`

### Frontend
- Health check: `https://tu-frontend.onrender.com/api/health`

### Logs
- Backend: Render dashboard del servicio de carga
- Frontend: Render dashboard del servicio principal

## Deployment

### Primera vez
1. Deploy backend con `simple-server.js`
2. Configurar variables de entorno
3. Verificar que funciona: `/health` y `/loading`
4. Deploy frontend normalmente
5. Actualizar `FRONTEND_URL` en el backend
6. Apuntar dominio al backend

### Updates
- **Frontend**: Auto-deploy desde Git
- **Backend**: Manual deploy cuando cambies la pantalla de carga

## Troubleshooting

### Backend no responde
- Verificar logs en Render dashboard
- Comprobar health check: `/health`
- Verificar variables de entorno

### Frontend no se detecta
- Verificar URL en `FRONTEND_URL`
- Comprobar health check del frontend: `/api/health`
- Revisar logs del navegador (F12 → Console)

### Redirección no funciona
- Verificar CORS en el frontend
- Comprobar endpoint `/api/frontend-status`
- Verificar timeout settings

## Costos Estimados (Render)

- **Backend (Starter)**: $7/mes (siempre activo)
- **Frontend (Free)**: $0/mes (con auto-sleep)
- **Total**: $7/mes

## Alternativas

### Backend Free con Cron
Si quieres ahorrar los $7/mes:
1. Usar plan Free para backend también
2. Configurar cron job externo para mantenerlo activo
3. El frontend tendrá ~30 segundos de cold start ocasionalmente

### Reverse Proxy
Otra opción es usar un reverse proxy que:
1. Detecte si el frontend responde
2. Sirva la pantalla de carga si no
3. Redirija cuando esté listo
