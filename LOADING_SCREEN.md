# Pantalla de Carga para Render

Este sistema permite que el backend sirva una pantalla de carga mientras el frontend se activa desde el modo sleep de Render.

## Cómo funciona

1. **Backend siempre activo**: El backend permanece activo y sirve la pantalla de carga
2. **Frontend bajo demanda**: El frontend se activa automáticamente cuando alguien accede
3. **Detección automática**: La pantalla de carga verifica cuando el frontend está listo
4. **Redirección automática**: Una vez listo, redirige automáticamente al frontend

## Configuración

### 1. Variables de entorno del backend

Crea un archivo `.env` en el backend con:

```env
FRONTEND_URL=https://tu-frontend-url.onrender.com
PORT=5000
```

### 2. URLs de Render

- **Backend**: Debe estar configurado para permanecer activo
- **Frontend**: Puede estar en modo sleep para ahorrar recursos

### 3. Actualizar URLs

En el archivo `loading.html`, actualiza la constante `FRONTEND_URL`:

```javascript
const FRONTEND_URL = 'https://tu-frontend-url.onrender.com';
```

## Rutas disponibles

- `GET /` - Redirige a la pantalla de carga
- `GET /loading` - Muestra la pantalla de carga
- `GET /health` - Health check del backend
- `GET /api/frontend-status` - Verifica el estado del frontend

## Endpoints del frontend

El frontend debe tener:
- `GET /api/health` - Health check que confirma que está listo

## Flujo de carga

1. Usuario accede a la URL del backend
2. Backend sirve la pantalla de carga
3. JavaScript verifica cada 2 segundos si el frontend está listo
4. Una vez detectado, redirige automáticamente al frontend
5. Si no responde en 60 segundos, muestra opción de reintentar

## Personalización

### Mensajes de carga

Puedes personalizar los mensajes editando el array `messages` en `loading.html`:

```javascript
const messages = [
    'Iniciando aplicación...',
    'Verificando servicios...',
    'Conectando con el servidor...',
    'Preparando la tienda...',
    'Casi listo...'
];
```

### Estilos

Los estilos CSS están en el `<style>` del archivo HTML y se pueden personalizar según tu marca.

### Timeouts

- `RETRY_INTERVAL`: Intervalo entre verificaciones (default: 2000ms)
- `MAX_RETRIES`: Máximo número de intentos (default: 30)

## Deployment en Render

### Backend
1. Configurar como Web Service
2. Usar `node server.js` como comando de inicio
3. Configurar variables de entorno
4. **Importante**: No usar auto-sleep para el backend

### Frontend
1. Configurar como Web Service normal
2. Puede usar auto-sleep para ahorrar recursos
3. Se activará automáticamente cuando sea necesario

## Monitoreo

El sistema incluye:
- Logs en la consola del navegador
- Indicadores visuales de estado
- Mensajes de error claros
- Botón de reintento en caso de fallas

## Beneficios

- **Mejor UX**: Los usuarios ven inmediatamente que algo está pasando
- **Ahorro de recursos**: El frontend puede usar auto-sleep
- **Confiabilidad**: El backend controla el proceso de carga
- **Branding**: Mantiene la identidad visual durante la carga
