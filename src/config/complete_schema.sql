-- Schema completo para Trebodeluxe con sistema de productos, variantes, tallas y stock

-- Tabla de usuarios (existente)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    rol VARCHAR(20) DEFAULT 'user' CHECK (rol IN ('user', 'admin', 'moderator'))
);

-- Tabla de información de envío (existente)
CREATE TABLE IF NOT EXISTS informacion_envio (
    id_informacion SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    nombre_completo VARCHAR(200) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- Tablas del sistema de tallas
CREATE TABLE IF NOT EXISTS sistemas_talla (
    id_sistema_talla SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- Tallas asociadas a un sistema de tallas (S, M, L, etc.)
CREATE TABLE IF NOT EXISTS tallas (
    id_talla SERIAL PRIMARY KEY,
    id_sistema_talla INTEGER NOT NULL,
    nombre_talla VARCHAR(20) NOT NULL,
    orden INTEGER NOT NULL, -- Para orden de visualización
    FOREIGN KEY (id_sistema_talla) REFERENCES sistemas_talla(id_sistema_talla) ON DELETE CASCADE
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    marca VARCHAR(50),
    id_sistema_talla INTEGER,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sistema_talla) REFERENCES sistemas_talla(id_sistema_talla) ON DELETE SET NULL
);

-- Variantes de un producto (por ejemplo: color, diseño)
CREATE TABLE IF NOT EXISTS variantes (
    id_variante SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL,
    nombre VARCHAR(100), -- ej: "Azul", "Rojo", "Diseño especial"
    precio NUMERIC(10,2) NOT NULL,
    precio_original NUMERIC(10,2), -- Para mostrar descuentos
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE
);

-- Imágenes de variantes
CREATE TABLE IF NOT EXISTS imagenes_variante (
    id_imagen SERIAL PRIMARY KEY,
    id_variante INTEGER NOT NULL,
    url VARCHAR(255) NOT NULL, -- secure_url de Cloudinary
    public_id VARCHAR(150) NOT NULL, -- public_id para eliminar/modificar en Cloudinary
    orden INTEGER NOT NULL, -- posición 1-5
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_variante) REFERENCES variantes(id_variante) ON DELETE CASCADE
);

-- Almacén / Inventario
CREATE TABLE IF NOT EXISTS stock (
    id_stock SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL,
    id_variante INTEGER NOT NULL,
    id_talla INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE CASCADE,
    FOREIGN KEY (id_variante) REFERENCES variantes(id_variante) ON DELETE CASCADE,
    FOREIGN KEY (id_talla) REFERENCES tallas(id_talla) ON DELETE CASCADE,
    UNIQUE(id_producto, id_variante, id_talla)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX IF NOT EXISTS idx_informacion_envio_usuario ON informacion_envio(id_usuario);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON variantes(id_producto);
CREATE INDEX IF NOT EXISTS idx_variantes_activo ON variantes(activo);
CREATE INDEX IF NOT EXISTS idx_imagenes_variante ON imagenes_variante(id_variante);
CREATE INDEX IF NOT EXISTS idx_stock_producto ON stock(id_producto);
CREATE INDEX IF NOT EXISTS idx_stock_variante ON stock(id_variante);
CREATE INDEX IF NOT EXISTS idx_stock_talla ON stock(id_talla);

-- Insertar datos de ejemplo
INSERT INTO sistemas_talla (nombre) VALUES 
('Ropa Estándar'),
('Zapatos EU'),
('Zapatos US')
ON CONFLICT DO NOTHING;

INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES 
(1, 'XS', 1),
(1, 'S', 2),
(1, 'M', 3),
(1, 'L', 4),
(1, 'XL', 5),
(1, 'XXL', 6),
(2, '35', 1),
(2, '36', 2),
(2, '37', 3),
(2, '38', 4),
(2, '39', 5),
(2, '40', 6),
(2, '41', 7),
(2, '42', 8),
(2, '43', 9),
(2, '44', 10),
(2, '45', 11),
(3, '6', 1),
(3, '7', 2),
(3, '8', 3),
(3, '9', 4),
(3, '10', 5),
(3, '11', 6),
(3, '12', 7)
ON CONFLICT DO NOTHING;

-- Insertar productos de ejemplo con fechas recientes
INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla, fecha_creacion) VALUES 
-- Productos más recientes (hace 1 día)
('Camiseta Premium Sport', 'Camiseta deportiva de alta calidad con tecnología dry-fit', 'Camisetas', 'Treboluxe', 1, NOW() - INTERVAL '1 day'),
('Polo Elegante Business', 'Polo profesional para ocasiones formales', 'Polos', 'Treboluxe', 1, NOW() - INTERVAL '1 day'),
('Hoodie Urban Style', 'Sudadera con capucha estilo urbano', 'Sudaderas', 'Treboluxe', 1, NOW() - INTERVAL '1 day'),
('Zapatillas Running Pro', 'Zapatillas profesionales para running', 'Calzado', 'SportLine', 2, NOW() - INTERVAL '1 day'),

-- Productos recientes (hace 3 días)
('Camiseta Básica', 'Camiseta básica de algodón 100%', 'Camisetas', 'Treboluxe', 1, NOW() - INTERVAL '3 days'),
('Polo Clásico', 'Polo de manga corta estilo clásico', 'Polos', 'Treboluxe', 1, NOW() - INTERVAL '3 days'),
('Jeans Slim Fit', 'Jeans de corte ajustado moderno', 'Pantalones', 'DenimCo', 1, NOW() - INTERVAL '3 days'),
('Zapatos Casuales', 'Zapatos casuales cómodos para el día a día', 'Calzado', 'ComfortWalk', 2, NOW() - INTERVAL '3 days'),

-- Productos hace 1 semana
('Camisa Oxford', 'Camisa formal de algodón oxford', 'Camisas', 'FormalWear', 1, NOW() - INTERVAL '7 days'),
('Pantalón Chino', 'Pantalón casual de algodón', 'Pantalones', 'CasualFit', 1, NOW() - INTERVAL '7 days'),
('Gorra Baseball', 'Gorra deportiva ajustable', 'Accesorios', 'SportCap', 1, NOW() - INTERVAL '7 days'),
('Zapatos Deportivos', 'Zapatos deportivos multiuso', 'Calzado', 'ActiveWear', 2, NOW() - INTERVAL '7 days'),

-- Productos hace 2 semanas (para promociones)
('Chaqueta Denim', 'Chaqueta de mezclilla clásica', 'Chaquetas', 'VintageStyle', 1, NOW() - INTERVAL '14 days'),
('Shorts Deportivos', 'Shorts cómodos para actividades deportivas', 'Shorts', 'ActiveFit', 1, NOW() - INTERVAL '14 days'),
('Reloj Digital', 'Reloj deportivo con funciones smart', 'Accesorios', 'TechTime', 1, NOW() - INTERVAL '14 days'),
('Mochila Urban', 'Mochila urbana con múltiples compartimentos', 'Accesorios', 'CityBag', 1, NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Insertar variantes de ejemplo con precios promocionales
INSERT INTO variantes (id_producto, nombre, precio, precio_original) VALUES 
-- Productos más recientes (id_producto 1-4)
(1, 'Azul Eléctrico', 34.99, 44.99),
(1, 'Negro Mate', 34.99, 44.99),
(1, 'Blanco Pure', 34.99, 44.99),
(2, 'Azul Navy', 54.99, 69.99),
(2, 'Gris Carbón', 54.99, 69.99),
(3, 'Negro', 79.99, 99.99),
(3, 'Gris Melange', 79.99, 99.99),
(4, 'Blanco/Azul', 119.99, 139.99),
(4, 'Negro/Rojo', 119.99, 139.99),

-- Productos recientes (id_producto 5-8)
(5, 'Azul', 29.99, 39.99),
(5, 'Blanco', 29.99, 39.99),
(5, 'Negro', 29.99, 39.99),
(6, 'Azul Marino', 49.99, 59.99),
(6, 'Blanco', 49.99, 59.99),
(7, 'Azul Clásico', 89.99, 109.99),
(7, 'Negro', 89.99, 109.99),
(8, 'Marrón', 79.99, 94.99),
(8, 'Negro', 79.99, 94.99),

-- Productos hace 1 semana (id_producto 9-12)
(9, 'Blanco', 69.99, 84.99),
(9, 'Azul Cielo', 69.99, 84.99),
(10, 'Beige', 59.99, 69.99),
(10, 'Negro', 59.99, 69.99),
(11, 'Negro', 24.99, 29.99),
(11, 'Azul', 24.99, 29.99),
(12, 'Blanco', 89.99, 99.99),
(12, 'Negro', 89.99, 99.99),

-- Productos promocionales (id_producto 13-16) - Mayor descuento
(13, 'Azul Vintage', 49.99, 89.99),
(13, 'Negro Clásico', 49.99, 89.99),
(14, 'Azul', 19.99, 34.99),
(14, 'Negro', 19.99, 34.99),
(14, 'Gris', 19.99, 34.99),
(15, 'Negro', 89.99, 159.99),
(15, 'Plateado', 89.99, 159.99),
(16, 'Negro', 39.99, 69.99),
(16, 'Azul', 39.99, 69.99)
ON CONFLICT DO NOTHING;

-- Insertar imágenes de ejemplo (usando las existentes) para todas las variantes
INSERT INTO imagenes_variante (id_variante, url, public_id, orden) VALUES 
-- Variantes 1-27
(1, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(2, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(3, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(4, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(5, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(6, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(7, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(8, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(9, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(10, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(11, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(12, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(13, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(14, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(15, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(16, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(17, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(18, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(19, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(20, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(21, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(22, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(23, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(24, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1),
(25, '/look-polo-2-1@2x.png', 'look-polo-2-1', 1),
(26, '/797e7904b64e13508ab322be3107e368-1@2x.png', '797e7904b64e13508ab322be3107e368-1', 1),
(27, '/sin-ttulo1-2@2x.png', 'sin-ttulo1-2', 1)
ON CONFLICT DO NOTHING;

-- Insertar stock de ejemplo
INSERT INTO stock (id_producto, id_variante, id_talla, cantidad) VALUES 
-- Camiseta Básica Azul
(1, 1, 1, 5), -- XS
(1, 1, 2, 15), -- S
(1, 1, 3, 25), -- M
(1, 1, 4, 20), -- L
(1, 1, 5, 10), -- XL
-- Camiseta Básica Blanca
(1, 2, 1, 8),
(1, 2, 2, 12),
(1, 2, 3, 30),
(1, 2, 4, 25),
(1, 2, 5, 15),
-- Camiseta Básica Negra
(1, 3, 1, 0), -- Agotada en XS
(1, 3, 2, 5),
(1, 3, 3, 15),
(1, 3, 4, 20),
(1, 3, 5, 8),
-- Polo Azul Marino
(2, 4, 2, 10),
(2, 4, 3, 20),
(2, 4, 4, 15),
(2, 4, 5, 12),
-- Polo Blanco
(2, 5, 2, 8),
(2, 5, 3, 18),
(2, 5, 4, 22),
(2, 5, 5, 10)
ON CONFLICT DO NOTHING;