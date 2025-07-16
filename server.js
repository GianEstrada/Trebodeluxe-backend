const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Datos de ejemplo (en producción usarías una base de datos)
let products = [
  {
    id: 1,
    name: "Camiseta Básica Premium",
    price: 24.99,
    originalPrice: 29.99,
    image: "/797e7904b64e13508ab322be3107e368-1@2x.png",
    category: "Camisetas",
    description: "Camiseta de algodón 100% premium",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blanco", "Negro", "Gris"],
    inStock: true,
    featured: true
  },
  {
    id: 2,
    name: "Polo Clásico",
    price: 34.99,
    originalPrice: 39.99,
    image: "/look-polo-2-1@2x.png",
    category: "Polos",
    description: "Polo clásico de algodón con cuello",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Azul", "Blanco", "Negro"],
    inStock: true,
    featured: false
  }
];

let promotions = [
  {
    id: 1,
    title: "Descuento de Verano",
    description: "20% de descuento en toda la colección de verano",
    type: "percentage",
    discountPercentage: 20,
    applicationType: "all_products",
    validFrom: "2025-06-01",
    validTo: "2025-08-31",
    isActive: true,
    currentUsage: 0
  },
  {
    id: 2,
    title: "2x1 en Camisetas",
    description: "Compra 2 camisetas y llévate la segunda gratis",
    type: "quantity",
    quantityRequired: 2,
    quantityFree: 1,
    applicationType: "specific_category",
    targetCategoryId: "camisetas",
    validFrom: "2025-07-01",
    validTo: "2025-07-31",
    isActive: true,
    currentUsage: 0
  }
];

let orders = [
  {
    id: 1001,
    customerName: "Juan Pérez",
    email: "juan@email.com",
    total: 149.97,
    status: "processing",
    orderDate: "2025-07-13",
    items: [
      { productName: "Camiseta Básica Premium", quantity: 2, price: 24.99 },
      { productName: "Polo Clásico", quantity: 1, price: 34.99 }
    ]
  }
];

let headerTexts = {
  promoTexts: [
    'ENVIO GRATIS EN PEDIDOS ARRIBA DE  MXN',
    'OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA'
  ],
  brandName: 'TREBOLUXE'
};

let homeImages = {
  heroImage1: '/797e7904b64e13508ab322be3107e368-1@2x.png',
  heroImage2: '/look-polo-2-1@2x.png',
  promosBannerImage: '/promociones-playa.jpg'
};

// Función para generar ID único
const generateId = () => Date.now();

// ========== PRODUCTOS ==========
// GET - Obtener todos los productos
app.get('/api/products', (req, res) => {
  try {
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

// GET - Obtener producto por ID
app.get('/api/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto',
      error: error.message
    });
  }
});

// POST - Crear nuevo producto
app.post('/api/products', (req, res) => {
  try {
    const newProduct = {
      id: generateId(),
      ...req.body
    };
    
    products.push(newProduct);
    
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: newProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
});

// PUT - Actualizar producto
app.put('/api/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    products[productIndex] = {
      ...products[productIndex],
      ...req.body,
      id: productId
    };
    
    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: products[productIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
});

// DELETE - Eliminar producto
app.delete('/api/products/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    products.splice(productIndex, 1);
    
    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
});

// ========== PROMOCIONES ==========
// GET - Obtener todas las promociones
app.get('/api/promotions', (req, res) => {
  try {
    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener promociones',
      error: error.message
    });
  }
});

// POST - Crear nueva promoción
app.post('/api/promotions', (req, res) => {
  try {
    const newPromotion = {
      id: generateId(),
      ...req.body
    };
    
    promotions.push(newPromotion);
    
    res.status(201).json({
      success: true,
      message: 'Promoción creada exitosamente',
      data: newPromotion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear promoción',
      error: error.message
    });
  }
});

// PUT - Actualizar promoción
app.put('/api/promotions/:id', (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    const promotionIndex = promotions.findIndex(p => p.id === promotionId);
    
    if (promotionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada'
      });
    }
    
    promotions[promotionIndex] = {
      ...promotions[promotionIndex],
      ...req.body,
      id: promotionId
    };
    
    res.json({
      success: true,
      message: 'Promoción actualizada exitosamente',
      data: promotions[promotionIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar promoción',
      error: error.message
    });
  }
});

// DELETE - Eliminar promoción
app.delete('/api/promotions/:id', (req, res) => {
  try {
    const promotionId = parseInt(req.params.id);
    const promotionIndex = promotions.findIndex(p => p.id === promotionId);
    
    if (promotionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Promoción no encontrada'
      });
    }
    
    promotions.splice(promotionIndex, 1);
    
    res.json({
      success: true,
      message: 'Promoción eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar promoción',
      error: error.message
    });
  }
});

// ========== PEDIDOS ==========
// GET - Obtener todos los pedidos
app.get('/api/orders', (req, res) => {
  try {
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos',
      error: error.message
    });
  }
});

// PUT - Actualizar estado de pedido
app.put('/api/orders/:id/status', (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const orderIndex = orders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }
    
    orders[orderIndex].status = status;
    
    res.json({
      success: true,
      message: 'Estado del pedido actualizado exitosamente',
      data: orders[orderIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado del pedido',
      error: error.message
    });
  }
});

// ========== TEXTOS DEL HEADER ==========
// GET - Obtener textos del header
app.get('/api/header-texts', (req, res) => {
  try {
    res.json({
      success: true,
      data: headerTexts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener textos del header',
      error: error.message
    });
  }
});

// PUT - Actualizar textos del header
app.put('/api/header-texts', (req, res) => {
  try {
    headerTexts = {
      ...headerTexts,
      ...req.body
    };
    
    res.json({
      success: true,
      message: 'Textos del header actualizados exitosamente',
      data: headerTexts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar textos del header',
      error: error.message
    });
  }
});

// ========== IMÁGENES ==========
// GET - Obtener imágenes principales
app.get('/api/home-images', (req, res) => {
  try {
    res.json({
      success: true,
      data: homeImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener imágenes',
      error: error.message
    });
  }
});

// PUT - Actualizar imágenes principales
app.put('/api/home-images', (req, res) => {
  try {
    homeImages = {
      ...homeImages,
      ...req.body
    };
    
    res.json({
      success: true,
      message: 'Imágenes actualizadas exitosamente',
      data: homeImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar imágenes',
      error: error.message
    });
  }
});

// ========== AUTENTICACIÓN ==========
// POST - Login de usuario
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validación básica (en producción deberías usar bcrypt y JWT)
    if (email === 'admin@treboluxe.com' && password === 'admin123') {
      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: 1,
            email: 'admin@treboluxe.com',
            name: 'Administrador',
            role: 'admin'
          },
          token: 'example-jwt-token'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

// ========== CATEGORÍAS ==========
// GET - Obtener categorías disponibles
app.get('/api/categories', (req, res) => {
  try {
    const categories = [
      { id: 'camisetas', name: 'Camisetas' },
      { id: 'pantalones', name: 'Pantalones' },
      { id: 'zapatos', name: 'Zapatos' },
      { id: 'accesorios', name: 'Accesorios' },
      { id: 'chaquetas', name: 'Chaquetas' },
      { id: 'vestidos', name: 'Vestidos' },
      { id: 'faldas', name: 'Faldas' },
      { id: 'ropa-interior', name: 'Ropa Interior' },
      { id: 'deportiva', name: 'Ropa Deportiva' },
      { id: 'formal', name: 'Ropa Formal' }
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
});

// ========== DASHBOARD STATS ==========
// GET - Obtener estadísticas del dashboard
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = {
      totalProducts: products.length,
      activePromotions: promotions.filter(p => p.isActive).length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      recentOrders: orders.slice(-5),
      lowStockProducts: products.filter(p => !p.inStock).length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`API disponible en: http://localhost:${PORT}/api`);
  console.log(`Endpoints disponibles:`);
  console.log(`  - GET  /api/products`);
  console.log(`  - POST /api/products`);
  console.log(`  - PUT  /api/products/:id`);
  console.log(`  - DELETE /api/products/:id`);
  console.log(`  - GET  /api/promotions`);
  console.log(`  - POST /api/promotions`);
  console.log(`  - PUT  /api/promotions/:id`);
  console.log(`  - DELETE /api/promotions/:id`);
  console.log(`  - GET  /api/orders`);
  console.log(`  - PUT  /api/orders/:id/status`);
  console.log(`  - GET  /api/header-texts`);
  console.log(`  - PUT  /api/header-texts`);
  console.log(`  - GET  /api/home-images`);
  console.log(`  - PUT  /api/home-images`);
  console.log(`  - POST /api/auth/login`);
  console.log(`  - GET  /api/categories`);
  console.log(`  - GET  /api/dashboard/stats`);
});

module.exports = app;
