# Trebodeluxe Backend

Backend para la aplicación Trebodeluxe, una tienda de ropa en línea.

## Características

- Autenticación de usuarios (registro, login)
- Gestión de perfiles de usuario
- Gestión de información de envío
- API RESTful
- Conexión a base de datos PostgreSQL

## Requisitos

- Node.js (v14 o superior)
- PostgreSQL

## Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repositorio>
cd Trebodeluxe-backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
Crea un archivo `.env` en la raíz del proyecto con la siguiente estructura:
```
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASS=tu_contraseña
DB_NAME=trebolux_db
DB_PORT=5432
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
```

4. Inicia el servidor:
```bash
npm run dev
```

## Estructura del Proyecto

```
src/
├── config/        # Configuración (DB, etc.)
├── controllers/   # Controladores de la API
├── middlewares/   # Middlewares (auth, errores)
├── models/        # Modelos de datos
├── routes/        # Rutas de la API
├── utils/         # Utilidades (tokens, etc.)
└── index.js       # Punto de entrada
```

## API Endpoints

### Autenticación

- `POST /api/auth/register` - Registrar un nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario autenticado

### Usuarios

- `PUT /api/users/profile` - Actualizar perfil de usuario
- `DELETE /api/users` - Eliminar cuenta de usuario

### Información de Envío

- `GET /api/shipping` - Obtener información de envío del usuario
- `POST /api/shipping` - Crear nueva información de envío
- `PUT /api/shipping/:id` - Actualizar información de envío
- `DELETE /api/shipping/:id` - Eliminar información de envío

## Despliegue

Este proyecto está configurado para ser desplegado en Render. Utiliza el archivo `render.yaml` para la configuración del servicio.

## Licencia

[MIT](LICENSE)
