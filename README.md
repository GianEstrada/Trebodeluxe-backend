# Treboluxe Backend API

Backend API para la tienda de ropa online Treboluxe. Desarrollado con Node.js, Express y CORS.

## 🚀 Características

- **API RESTful** para gestión de productos, promociones y pedidos
- **Autenticación** básica de usuarios
- **CORS** configurado para frontend
- **Gestión de categorías** de productos
- **Dashboard** con estadísticas
- **Textos dinámicos** del header
- **Gestión de imágenes** principales

## 📋 Endpoints disponibles

### Productos
- `GET /api/products` - Obtener todos los productos
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear nuevo producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto

### Promociones
- `GET /api/promotions` - Obtener todas las promociones
- `POST /api/promotions` - Crear nueva promoción
- `PUT /api/promotions/:id` - Actualizar promoción
- `DELETE /api/promotions/:id` - Eliminar promoción

### Pedidos
- `GET /api/orders` - Obtener todos los pedidos
- `PUT /api/orders/:id/status` - Actualizar estado del pedido

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Configuración
- `GET /api/header-texts` - Obtener textos del header
- `PUT /api/header-texts` - Actualizar textos del header
- `GET /api/home-images` - Obtener imágenes principales
- `PUT /api/home-images` - Actualizar imágenes principales

### Utilidades
- `GET /api/categories` - Obtener categorías disponibles
- `GET /api/dashboard/stats` - Obtener estadísticas del dashboard

## 🛠️ Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/treboluxe-backend.git
   cd treboluxe-backend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor:**
   ```bash
   npm start
   ```

   Para desarrollo (con nodemon):
   ```bash
   npm run dev
   ```

## 📁 Estructura del proyecto

```
treboluxe-backend/
├── server.js          # Servidor principal
├── package.json       # Configuración del proyecto
├── README.md          # Documentación
└── .gitignore         # Archivos ignorados por Git
```

## 🔧 Configuración

### Variables de entorno
El servidor usa las siguientes variables de entorno:
- `PORT` - Puerto del servidor (default: 5000)
- `NODE_ENV` - Entorno de ejecución (development/production)

### Puerto predeterminado
El servidor se ejecuta en el puerto 5000 por defecto. Puedes cambiarlo configurando la variable de entorno `PORT`.

## 📊 Datos de ejemplo

El servidor incluye datos de ejemplo para:
- **Productos**: Camisetas, polos, zapatos, etc.
- **Promociones**: Descuentos y ofertas especiales
- **Pedidos**: Pedidos de ejemplo
- **Configuración**: Textos del header e imágenes

## 🚀 Despliegue

### Render
Para desplegar en Render:
1. Conecta tu repositorio de GitHub
2. Configura el servicio web
3. Build Command: `npm install`
4. Start Command: `npm start`

### Heroku
Para desplegar en Heroku:
```bash
heroku create treboluxe-backend
git push heroku main
```

### Variables de entorno en producción
```
NODE_ENV=production
PORT=5000
```

## 🔒 Seguridad

- **CORS** configurado para permitir requests del frontend
- **Middleware** de manejo de errores
- **Validación** básica de datos

## 📝 Autenticación

La autenticación actual es básica para demostración:
- **Email**: admin@treboluxe.com
- **Password**: admin123

⚠️ **Nota**: En producción, implementar autenticación robusta con JWT, bcrypt y base de datos real.

## 🔮 Próximas mejoras

- [ ] Base de datos real (MongoDB/PostgreSQL)
- [ ] Autenticación JWT
- [ ] Validación de datos con Joi
- [ ] Tests unitarios
- [ ] Documentación con Swagger
- [ ] Rate limiting
- [ ] Logs estructurados
- [ ] Caching con Redis

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

Treboluxe Team - contacto@treboluxe.com

Link del proyecto: [https://github.com/tu-usuario/treboluxe-backend](https://github.com/tu-usuario/treboluxe-backend)
