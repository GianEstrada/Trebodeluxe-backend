# Variables de entorno para Render - Backend Trebodeluxe

## Configuración del Servidor
NODE_ENV=production
PORT=10000

## Base de Datos PostgreSQL (Render)
DATABASE_URL=postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com:5432/trebolux_db

## JWT Configuration
JWT_SECRET=trebodeluxe_production_secret_key_2025_render_secure
JWT_EXPIRES_IN=24h

## CORS Configuration
CORS_ORIGIN=https://trebodeluxe-front.onrender.com

## Logging
LOG_LEVEL=info

---

### INSTRUCCIONES PARA CONFIGURAR EN RENDER:

1. Ve a tu servicio backend en Render Dashboard
2. Ve a la sección "Environment" 
3. Agrega las siguientes variables:

```
NODE_ENV = production
PORT = 10000
DATABASE_URL = postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com:5432/trebolux_db
JWT_SECRET = trebodeluxe_production_secret_key_2025_render_secure
JWT_EXPIRES_IN = 24h
CORS_ORIGIN = https://trebodeluxe-front.onrender.com
```

4. Haz redeploy del servicio

### NOTAS DE SEGURIDAD:
- JWT_SECRET debe ser una cadena aleatoria y segura en producción
- Mantén las credenciales de la base de datos seguras
- Solo configura CORS_ORIGIN con el dominio de tu frontend
