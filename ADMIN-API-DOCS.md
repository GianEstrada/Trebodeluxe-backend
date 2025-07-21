# Admin Panel - API Documentation

## Configuración Necesaria

### Variables de Entorno
```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### Autenticación
Todas las rutas del admin requieren:
- **Header**: `Authorization: Bearer <jwt_token>`
- **Rol**: `admin` en el token JWT

---

## 🏠 **Endpoints Principales**

### **Estadísticas del Admin**
```http
GET /api/admin/products/stats
```
**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_productos": 25,
    "productos_activos": 22,
    "total_variantes": 45,
    "variantes_activas": 42,
    "total_categorias": 8,
    "total_marcas": 12,
    "stock_total": 1250
  }
}
```

### **Datos para Formularios**
```http
GET /api/admin/products/form-data
```
**Respuesta:**
```json
{
  "success": true,
  "data": {
    "categories": [{"categoria": "Camisetas", "total_productos": 5}],
    "brands": [{"marca": "Nike", "total_productos": 3}],
    "sizeSystems": [{"id_sistema_talla": 1, "nombre": "Estándar"}]
  }
}
```

---

## 📦 **Gestión de Productos**

### **Listar Productos con Filtros**
```http
GET /api/admin/products?search=camiseta&categoria=Ropa&marca=Nike&activo=true&limit=20&offset=0&sortBy=fecha_creacion&sortOrder=DESC
```

**Parámetros:**
- `search` - Buscar en nombre, descripción, marca
- `categoria` - Filtrar por categoría
- `marca` - Filtrar por marca
- `activo` - `true/false` para productos activos/inactivos
- `limit` - Número de resultados (default: 20)
- `offset` - Offset para paginación (default: 0)
- `sortBy` - Campo de ordenación: `nombre`, `categoria`, `marca`, `fecha_creacion`, `activo`
- `sortOrder` - `ASC` o `DESC`

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id_producto": 1,
        "nombre": "Camiseta Premium Sport",
        "descripcion": "Camiseta deportiva de alta calidad",
        "categoria": "Camisetas",
        "marca": "TreboSport",
        "activo": true,
        "fecha_creacion": "2025-07-21T10:30:00.000Z",
        "sistema_talla": "Estándar",
        "total_variantes": 3,
        "variantes_activas": 3,
        "stock_total": 65,
        "precio_minimo": 29.99,
        "precio_maximo": 32.99,
        "imagen_principal": "https://res.cloudinary.com/...",
        "imagen_public_id": "trebodeluxe/productos/sample1"
      }
    ],
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### **Crear Producto**
```http
POST /api/admin/products
Content-Type: multipart/form-data

Body:
- nombre: "Nuevo Producto"
- descripcion: "Descripción del producto"
- categoria: "Camisetas"
- marca: "MiMarca"
- id_sistema_talla: 1 (opcional)
- nombre_variante: "Azul Marino"
- precio: 29.99
- precio_original: 39.99 (opcional)
- imagen: <archivo> (opcional)
```

### **Obtener Producto para Edición**
```http
GET /api/admin/products/:id
```

### **Actualizar Producto**
```http
PUT /api/admin/products/:id
Content-Type: application/json

Body:
{
  "nombre": "Producto Actualizado",
  "descripcion": "Nueva descripción",
  "categoria": "Nueva Categoria",
  "marca": "Nueva Marca",
  "id_sistema_talla": 2,
  "activo": true
}
```

### **Eliminar Producto**
```http
DELETE /api/admin/products/:id
```
*Elimina automáticamente todas las imágenes de Cloudinary asociadas*

---

## 🎨 **Gestión de Variantes**

### **Listar Variantes de un Producto**
```http
GET /api/admin/products/:id_producto/variants
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id_variante": 1,
      "nombre": "Azul Marino",
      "precio": 29.99,
      "precio_original": 39.99,
      "descuento_porcentaje": 25.06,
      "activo": true,
      "stock_disponible": 25,
      "imagenes": [
        {
          "id_imagen": 1,
          "url": "https://res.cloudinary.com/...",
          "public_id": "trebodeluxe/productos/sample1",
          "orden": 1
        }
      ]
    }
  ]
}
```

### **Crear Variante**
```http
POST /api/admin/products/:id_producto/variants
Content-Type: application/json

Body:
{
  "nombre": "Verde Militar",
  "precio": 32.99,
  "precio_original": 45.99
}
```

### **Actualizar Variante**
```http
PUT /api/admin/products/variant/:id_variante
Content-Type: application/json

Body:
{
  "nombre": "Verde Militar Oscuro",
  "precio": 35.99,
  "precio_original": 49.99,
  "activo": true
}
```

### **Eliminar Variante**
```http
DELETE /api/admin/products/variant/:id_variante
```

---

## 🖼️ **Gestión de Imágenes**

### **Subir Imagen a Variante**
```http
POST /api/admin/products/variant/:id_variante/image
Content-Type: multipart/form-data

Body:
- imagen: <archivo>
- orden: 1 (opcional)
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id_imagen": 5,
    "url": "https://res.cloudinary.com/demo/image/upload/v1642/trebodeluxe/productos/abc123.jpg",
    "public_id": "trebodeluxe/productos/abc123",
    "orden": 1,
    "variants": {
      "thumbnail": "https://res.cloudinary.com/.../c_fill,w_150,h_150/...",
      "small": "https://res.cloudinary.com/.../c_fit,w_300,h_300/...",
      "medium": "https://res.cloudinary.com/.../c_fit,w_600,h_600/...",
      "large": "https://res.cloudinary.com/.../c_fit,w_1200,h_1200/...",
      "original": "https://res.cloudinary.com/..."
    }
  }
}
```

### **Eliminar Imagen**
```http
DELETE /api/images/:id_imagen
```

### **Actualizar Orden de Imagen**
```http
PUT /api/images/:id_imagen/order
Content-Type: application/json

Body:
{
  "orden": 2
}
```

---

## 📋 **Casos de Uso Típicos**

### **1. Crear Producto Completo**
```javascript
// 1. Crear producto con variante inicial
const formData = new FormData();
formData.append('nombre', 'Camiseta Deportiva');
formData.append('categoria', 'Camisetas');
formData.append('marca', 'SportMax');
formData.append('nombre_variante', 'Azul Marino');
formData.append('precio', '29.99');
formData.append('precio_original', '39.99');
formData.append('imagen', fileInput.files[0]);

const response = await fetch('/api/admin/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
const productId = result.data.product.id_producto;
```

### **2. Buscar y Filtrar Productos**
```javascript
const params = new URLSearchParams({
  search: 'camiseta',
  categoria: 'Ropa',
  activo: 'true',
  limit: '10',
  offset: '0',
  sortBy: 'nombre',
  sortOrder: 'ASC'
});

const response = await fetch(`/api/admin/products?${params}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await response.json();
console.log(`Encontrados ${data.total} productos`);
```

### **3. Subir Múltiples Imágenes**
```javascript
// Subir imágenes adicionales a una variante
for (let i = 0; i < files.length; i++) {
  const formData = new FormData();
  formData.append('imagen', files[i]);
  formData.append('orden', i + 2); // Empezar desde 2

  await fetch(`/api/admin/products/variant/${variantId}/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
}
```

---

## ⚡ **Características Implementadas**

✅ **Búsqueda avanzada** - Por nombre, descripción, marca
✅ **Filtros múltiples** - Categoría, marca, estado activo
✅ **Paginación** - Con límite y offset configurables
✅ **Ordenación** - Por múltiples campos ASC/DESC
✅ **Subida de imágenes** - A Cloudinary con optimización
✅ **Gestión completa** - CRUD para productos y variantes
✅ **Eliminación segura** - Limpia imágenes de Cloudinary
✅ **Estadísticas** - Panel de control con métricas
✅ **Validaciones** - Campos obligatorios y formatos
✅ **Manejo de errores** - Respuestas consistentes

---

## 🔧 **Próximos Pasos de Integración**

1. **Configurar Cloudinary** con tus credenciales
2. **Probar endpoints** con Postman
3. **Crear interfaz de admin** en tu frontend
4. **Implementar formularios** de productos y variantes
5. **Agregar drag & drop** para imágenes
6. **Implementar preview** de imágenes optimizadas
