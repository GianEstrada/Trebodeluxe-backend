# Configuración de Cloudinary para Trebodeluxe Backend

## Configuración Inicial

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### 2. Estructura de Carpetas en Cloudinary

Las imágenes se organizan automáticamente en:
- `trebodeluxe/productos/` - Imágenes de variantes de productos
- `trebodeluxe/promociones/` - Imágenes de promociones (futuro)

## API Endpoints

### Imágenes de Productos

#### Subir imagen a una variante
```http
POST /api/images/variant/:id_variante
Content-Type: multipart/form-data

Body:
- image: archivo de imagen
- orden: número de orden (opcional, default: 1)
```

#### Subir múltiples imágenes
```http
POST /api/images/variant/:id_variante/multiple
Content-Type: multipart/form-data

Body:
- images[]: array de archivos de imagen (máximo 5)
```

#### Obtener imágenes de una variante
```http
GET /api/images/variant/:id_variante
```

#### Obtener todas las imágenes de un producto
```http
GET /api/images/product/:id_producto
```

#### Obtener imagen principal de cada variante
```http
GET /api/images/product/:id_producto/main
```

#### Obtener imágenes para catálogo
```http
GET /api/images/catalog?limit=50&offset=0
```

#### Eliminar una imagen
```http
DELETE /api/images/:id_imagen
```

#### Actualizar orden de imagen
```http
PUT /api/images/:id_imagen/order
Content-Type: application/json

Body:
{
  "orden": 2
}
```

### Productos con Imágenes

#### Obtener catálogo optimizado
```http
GET /api/products/catalog?limit=20&offset=0&categoria=Camisetas&sortBy=fecha_creacion&sortOrder=DESC
```

#### Obtener productos destacados
```http
GET /api/products/featured?limit=12
```

#### Obtener categorías disponibles
```http
GET /api/products/categories
```

### Promociones con Imágenes

#### Obtener promociones para página principal
```http
GET /api/promotions/homepage?limit=5
```

#### Obtener productos de una promoción
```http
GET /api/promotions/:id_promocion/products?limit=10
```

#### Obtener promociones por categoría
```http
GET /api/promotions/category/:categoria
```

## Respuestas de la API

### Formato de Imagen con Variantes
```json
{
  "id_imagen": 1,
  "url": "https://res.cloudinary.com/...",
  "public_id": "trebodeluxe/productos/sample1",
  "orden": 1,
  "variants": {
    "thumbnail": "https://res.cloudinary.com/...c_fill,w_150,h_150/...",
    "small": "https://res.cloudinary.com/...c_fit,w_300,h_300/...",
    "medium": "https://res.cloudinary.com/...c_fit,w_600,h_600/...",
    "large": "https://res.cloudinary.com/...c_fit,w_1200,h_1200/...",
    "original": "https://res.cloudinary.com/..."
  }
}
```

### Producto para Catálogo
```json
{
  "id_producto": 1,
  "nombre": "Camiseta Premium Sport",
  "descripcion": "Camiseta deportiva de alta calidad",
  "categoria": "Camisetas",
  "marca": "TreboSport",
  "precio_min": 29.99,
  "precio_original": 39.99,
  "descuento_porcentaje": 25.06,
  "imagen_principal": "https://res.cloudinary.com/...",
  "imagen_public_id": "trebodeluxe/productos/sample1",
  "stock_disponible": 45
}
```

## Uso en el Frontend

### Ejemplo con React
```javascript
// Obtener productos para catálogo
const response = await fetch('/api/products/catalog?limit=20');
const { data: catalogData } = await response.json();

// Mostrar imagen optimizada
<img 
  src={product.imagen_principal}
  alt={product.nombre}
  loading="lazy"
/>

// Obtener promociones para homepage
const promoResponse = await fetch('/api/promotions/homepage?limit=5');
const { data: promotions } = await promoResponse.json();
```

### Subir Imagen
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('orden', '1');

const response = await fetch(`/api/images/variant/${variantId}`, {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  console.log('Imagen subida:', result.data);
}
```

## Características Implementadas

✅ **Subida de imágenes** - Cloudinary con optimización automática
✅ **Múltiples tamaños** - Thumbnail, small, medium, large, original
✅ **Gestión de orden** - Control de orden de visualización de imágenes
✅ **Catálogo optimizado** - Consultas eficientes para listados
✅ **Productos destacados** - Para página principal
✅ **Promociones con imágenes** - Visualización de ofertas
✅ **Limpieza automática** - Eliminación de archivos temporales
✅ **Validación de archivos** - Tipos y tamaños permitidos
✅ **Manejo de errores** - Respuestas consistentes

## Próximos Pasos

1. **Configurar tus credenciales de Cloudinary** en `.env`
2. **Probar las rutas** con Postman o tu frontend
3. **Integrar en el frontend** para subir y mostrar imágenes
4. **Configurar optimizaciones** según tus necesidades específicas
