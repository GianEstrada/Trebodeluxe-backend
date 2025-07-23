-- complete_schema_with_promotions_and_orders.sql - Esquema completo actualizado con pedidos y envíos

-- Crear extensión para UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas si existen (en orden inverso de dependencias)
DROP TABLE IF EXISTS notas_generales CASCADE;
DROP TABLE IF EXISTS seguimiento_envio CASCADE;
DROP TABLE IF EXISTS pedido_detalle CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS metodos_pago CASCADE;
DROP TABLE IF EXISTS metodos_envio CASCADE;

DROP TABLE IF EXISTS promocion_aplicacion CASCADE;
DROP TABLE IF EXISTS promo_codigo CASCADE;
DROP TABLE IF EXISTS promo_porcentaje CASCADE;
DROP TABLE IF EXISTS promo_x_por_y CASCADE;
DROP TABLE IF EXISTS promociones CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS imagenes_variante CASCADE;
DROP TABLE IF EXISTS variantes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS tallas CASCADE;
DROP TABLE IF EXISTS sistemas_talla CASCADE;
DROP TABLE IF EXISTS imagenes_principales CASCADE;
DROP TABLE IF EXISTS configuraciones_sitio CASCADE;
DROP TABLE IF EXISTS informacion_envio CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ==== USUARIOS Y ENVÍO ====

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    rol VARCHAR(20) DEFAULT 'user' CHECK (rol IN ('user', 'admin', 'moderator'))
);

CREATE TABLE informacion_envio (
    id_informacion SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    nombre_completo VARCHAR(200) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    estado VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    pais VARCHAR(100) NOT NULL,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==== IMÁGENES PRINCIPALES DEL SITIO ====

CREATE TABLE imagenes_principales (
    id_imagen SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    public_id VARCHAR(200),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('hero_banner', 'promocion_banner', 'categoria_destacada')),
    titulo VARCHAR(200),
    subtitulo VARCHAR(300),
    enlace VARCHAR(300),
    orden INTEGER NOT NULL DEFAULT 1,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==== CONFIGURACIONES DEL SITIO ====

CREATE TABLE configuraciones_sitio (
    id_configuracion SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'text',
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_configuraciones ON configuraciones_sitio;
CREATE TRIGGER trigger_actualizar_fecha_configuraciones
    BEFORE UPDATE ON configuraciones_sitio
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes ON imagenes_principales;
CREATE TRIGGER trigger_actualizar_fecha_imagenes
    BEFORE UPDATE ON imagenes_principales
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

-- Trigger para actualizar fecha automáticamente en notas generales
DROP TRIGGER IF EXISTS trigger_actualizar_fecha_notas ON notas_generales;
CREATE TRIGGER trigger_actualizar_fecha_notas
    BEFORE UPDATE ON notas_generales
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

-- ==== SISTEMA DE TALLAS ====

CREATE TABLE sistemas_talla (
    id_sistema_talla SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE tallas (
    id_talla SERIAL PRIMARY KEY,
    id_sistema_talla INTEGER NOT NULL REFERENCES sistemas_talla(id_sistema_talla) ON DELETE CASCADE,
    nombre_talla VARCHAR(20) NOT NULL,
    orden INTEGER NOT NULL
);

-- ==== PRODUCTOS ====

CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria VARCHAR(50),
    marca VARCHAR(50),
    id_sistema_talla INTEGER REFERENCES sistemas_talla(id_sistema_talla) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE variantes (
    id_variante SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    precio_original NUMERIC(10,2),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE imagenes_variante (
    id_imagen SERIAL PRIMARY KEY,
    id_variante INTEGER NOT NULL REFERENCES variantes(id_variante) ON DELETE CASCADE,
    url VARCHAR(255) NOT NULL,
    public_id VARCHAR(150) NOT NULL,
    orden INTEGER NOT NULL
);

CREATE TABLE stock (
    id_stock SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_variante INTEGER NOT NULL REFERENCES variantes(id_variante) ON DELETE CASCADE,
    id_talla INTEGER NOT NULL REFERENCES tallas(id_talla) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_producto, id_variante, id_talla)
);

-- ==== PROMOCIONES ====

CREATE TABLE promociones (
    id_promocion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('x_por_y', 'porcentaje', 'codigo')),
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    uso_maximo INTEGER,
    veces_usado INTEGER DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE promo_x_por_y (
    id_x_por_y SERIAL PRIMARY KEY,
    id_promocion INTEGER NOT NULL REFERENCES promociones(id_promocion) ON DELETE CASCADE,
    cantidad_comprada INTEGER NOT NULL,
    cantidad_pagada INTEGER NOT NULL,
    UNIQUE(id_promocion)
);

CREATE TABLE promo_porcentaje (
    id_porcentaje SERIAL PRIMARY KEY,
    id_promocion INTEGER NOT NULL REFERENCES promociones(id_promocion) ON DELETE CASCADE,
    porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
    UNIQUE(id_promocion)
);

CREATE TABLE promo_codigo (
    id_codigo SERIAL PRIMARY KEY,
    id_promocion INTEGER NOT NULL REFERENCES promociones(id_promocion) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descuento NUMERIC(10,2) NOT NULL,
    tipo_descuento VARCHAR(20) NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'monto')),
    UNIQUE(id_promocion)
);

CREATE TABLE promocion_aplicacion (
    id_aplicacion SERIAL PRIMARY KEY,
    id_promocion INTEGER NOT NULL REFERENCES promociones(id_promocion) ON DELETE CASCADE,
    tipo_objetivo VARCHAR(30) NOT NULL CHECK (tipo_objetivo IN ('todos', 'categoria', 'producto')),
    id_categoria VARCHAR(50),
    id_producto INTEGER REFERENCES productos(id_producto) ON DELETE CASCADE
);

-- ==== NUEVAS TABLAS PARA PEDIDOS Y ENVÍOS ====

CREATE TABLE metodos_envio (
    id_metodo_envio SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL, -- Ej: DHL, FedEx, Estafeta
    descripcion TEXT
);

CREATE TABLE metodos_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT
);

CREATE TABLE pedidos (
    id_pedido SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    id_informacion_envio INTEGER REFERENCES informacion_envio(id_informacion) ON DELETE SET NULL,
    id_metodo_envio INTEGER REFERENCES metodos_envio(id_metodo_envio) ON DELETE RESTRICT,
    id_metodo_pago INTEGER REFERENCES metodos_pago(id_metodo_pago) ON DELETE RESTRICT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('carrito', 'pendiente', 'procesando', 'en_espera', 'enviado', 'terminado', 'problema')),
    total NUMERIC(10,2),
    token_sesion VARCHAR(100), -- Para pedidos de invitados sin cuenta
    notas TEXT -- Campo para notas administrativas
);

CREATE TABLE pedido_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    id_producto INTEGER REFERENCES productos(id_producto) ON DELETE RESTRICT,
    id_variante INTEGER REFERENCES variantes(id_variante) ON DELETE RESTRICT,
    id_talla INTEGER REFERENCES tallas(id_talla) ON DELETE RESTRICT,
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL -- Precio al momento de la compra
);

CREATE TABLE seguimiento_envio (
    id_seguimiento SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    id_metodo_envio INTEGER NOT NULL REFERENCES metodos_envio(id_metodo_envio) ON DELETE RESTRICT,
    clave_rastreo VARCHAR(100) NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_envio VARCHAR(50) -- Ej: en tránsito, entregado, etc.
);

-- ==== NOTAS GENERALES ====
CREATE TABLE notas_generales (
    id_nota SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    id_usuario_creador INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    nombre_usuario_creador VARCHAR(100), -- Para preservar el nombre aunque se elimine el usuario
    rol_usuario_creador VARCHAR(20), -- Para preservar el rol
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    fecha_vencimiento TIMESTAMP, -- Para notas con fecha límite
    etiquetas TEXT[], -- Array de etiquetas para categorización
    color VARCHAR(20) DEFAULT 'default' -- Para personalización visual
);

-- ==== ÍNDICES PARA RENDIMIENTO ====

CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX idx_informacion_envio_usuario ON informacion_envio(id_usuario);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_fecha ON productos(fecha_creacion);
CREATE INDEX idx_variantes_producto ON variantes(id_producto);
CREATE INDEX idx_variantes_activo ON variantes(activo);
CREATE INDEX idx_stock_producto ON stock(id_producto);
CREATE INDEX idx_stock_variante ON stock(id_variante);
CREATE INDEX idx_stock_talla ON stock(id_talla);
CREATE INDEX idx_promociones_activo ON promociones(activo);
CREATE INDEX idx_promociones_fechas ON promociones(fecha_inicio, fecha_fin);
CREATE INDEX idx_promocion_aplicacion_tipo ON promocion_aplicacion(tipo_objetivo);
CREATE INDEX idx_promocion_aplicacion_categoria ON promocion_aplicacion(id_categoria);
CREATE INDEX idx_promocion_aplicacion_producto ON promocion_aplicacion(id_producto);
CREATE INDEX idx_imagenes_principales_tipo ON imagenes_principales(tipo);
CREATE INDEX idx_imagenes_principales_activo ON imagenes_principales(activo);
CREATE INDEX idx_imagenes_principales_orden ON imagenes_principales(orden);
CREATE INDEX idx_notas_generales_prioridad ON notas_generales(prioridad);
CREATE INDEX idx_notas_generales_fecha_creacion ON notas_generales(fecha_creacion);
CREATE INDEX idx_notas_generales_activo ON notas_generales(activo);
CREATE INDEX idx_notas_generales_usuario_creador ON notas_generales(id_usuario_creador);
CREATE INDEX idx_notas_generales_fecha_vencimiento ON notas_generales(fecha_vencimiento);


-- ==== DATOS DE PRUEBA ====
-- Insertar sistemas de tallas
INSERT INTO sistemas_talla (nombre) VALUES 
    ('Estándar'),
    ('Numérico'),
    ('US'),
    ('EU');

-- Insertar tallas para cada sistema
INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES 
    -- Sistema Estándar (1)
    (1, 'XS', 1),
    (1, 'S', 2),
    (1, 'M', 3),
    (1, 'L', 4),
    (1, 'XL', 5),
    (1, 'XXL', 6),
    -- Sistema Numérico (2) - Zapatos
    (2, '36', 1),
    (2, '37', 2),
    (2, '38', 3),
    (2, '39', 4),
    (2, '40', 5),
    (2, '41', 6),
    (2, '42', 7),
    (2, '43', 8),
    (2, '44', 9),
    -- Sistema US (3)
    (3, '6', 1),
    (3, '7', 2),
    (3, '8', 3),
    (3, '9', 4),
    (3, '10', 5),
    (3, '11', 6),
    (3, '12', 7),
    -- Sistema EU (4)
    (4, '38', 1),
    (4, '40', 2),
    (4, '42', 3),
    (4, '44', 4),
    (4, '46', 5);

-- Insertar productos de prueba con fechas estratificadas
INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla, fecha_creacion) VALUES 
    -- Productos recientes (hoy)
    ('Camiseta Premium Sport', 'Camiseta deportiva de alta calidad con tecnología dry-fit para máximo rendimiento', 'Camisetas', 'TreboSport', 1, NOW()),
    ('Pantalón Casual Denim', 'Pantalón de mezclilla con corte moderno y cómodo, perfecto para uso diario', 'Pantalones', 'UrbanStyle', 1, NOW()),
    ('Sneakers Urban Pro', 'Zapatillas deportivas con diseño urbano moderno y suela antideslizante', 'Zapatos', 'SportMax', 2, NOW()),
    
    -- Productos de hace 3 días
    ('Polo Clásico Navy', 'Polo de algodón 100% con bordado distintivo, ideal para ocasiones casuales', 'Camisetas', 'ClassicWear', 1, NOW() - INTERVAL '3 days'),
    ('Shorts Deportivos', 'Shorts transpirables ideales para entrenamientos y actividades deportivas', 'Pantalones', 'FitGear', 1, NOW() - INTERVAL '3 days'),
    ('Gorra Baseball Negra', 'Gorra ajustable con logo bordado, protección UV y diseño clásico', 'Accesorios', 'CapStyle', NULL, NOW() - INTERVAL '3 days'),
    
    -- Productos de hace 1 semana
    ('Chaqueta Bomber', 'Chaqueta estilo bomber con forro interior suave y cierre frontal', 'Chaquetas', 'StreetStyle', 1, NOW() - INTERVAL '1 week'),
    ('Zapatillas Running', 'Zapatillas especializadas para correr con amortiguación avanzada', 'Zapatos', 'RunTech', 2, NOW() - INTERVAL '1 week'),
    ('Camisa Oxford', 'Camisa formal de algodón con cuello clásico, perfecta para oficina', 'Camisas', 'FormalWear', 1, NOW() - INTERVAL '1 week'),
    ('Jeans Slim Fit', 'Jeans de corte ajustado con lavado moderno y excelente durabilidad', 'Pantalones', 'DenimCo', 1, NOW() - INTERVAL '1 week'),
    
    -- Productos de hace 2 semanas
    ('Gorra Baseball', 'Gorra deportiva ajustable con diseño versátil para cualquier ocasión', 'Accesorios', 'SportCap', NULL, NOW() - INTERVAL '2 weeks'),
    ('Sudadera con Capucha', 'Sudadera cómoda con bolsillo canguro y capucha ajustable', 'Sudaderas', 'ComfortWear', 1, NOW() - INTERVAL '2 weeks'),
    ('Chaqueta Denim', 'Chaqueta de mezclilla clásica con corte relajado y estilo atemporal', 'Chaquetas', 'VintageStyle', 1, NOW() - INTERVAL '2 weeks'),
    ('Tenis Casual', 'Tenis versátiles para uso diario con suela cómoda y diseño moderno', 'Zapatos', 'DailyWear', 2, NOW() - INTERVAL '2 weeks'),
    ('Bermudas Cargo', 'Bermudas con múltiples bolsillos funcionales y tela resistente', 'Pantalones', 'UtilityWear', 1, NOW() - INTERVAL '2 weeks'),
    ('Playera Básica Blanca', 'Playera de algodón básica en color blanco, esencial para cualquier guardarropa', 'Camisetas', 'BasicWear', 1, NOW() - INTERVAL '2 weeks');

-- Insertar variantes para cada producto
INSERT INTO variantes (id_producto, nombre, precio, precio_original) VALUES 
    -- Camiseta Premium Sport (1)
    (1, 'Azul Marino', 29.99, 39.99),
    (1, 'Rojo', 29.99, 39.99),
    (1, 'Negro', 32.99, 39.99),
    
    -- Pantalón Casual Denim (2)
    (2, 'Azul Clásico', 49.99, 59.99),
    (2, 'Negro', 54.99, 59.99),
    
    -- Sneakers Urban Pro (3)
    (3, 'Blanco/Negro', 89.99, 109.99),
    (3, 'Negro/Rojo', 89.99, 109.99),
    
    -- Polo Clásico Navy (4)
    (4, 'Navy', 24.99, 29.99),
    (4, 'Blanco', 24.99, 29.99),
    
    -- Shorts Deportivos (5)
    (5, 'Negro', 19.99, 24.99),
    (5, 'Azul', 19.99, 24.99),
    (5, 'Gris', 21.99, 24.99),
    
    -- Gorra Baseball Negra (6)
    (6, 'Negro', 15.99, NULL),
    
    -- Chaqueta Bomber (7)
    (7, 'Verde Militar', 79.99, 99.99),
    (7, 'Negro', 79.99, 99.99),
    
    -- Zapatillas Running (8)
    (8, 'Azul/Blanco', 119.99, 149.99),
    (8, 'Gris/Negro', 119.99, 149.99),
    
    -- Camisa Oxford (9)
    (9, 'Blanco', 39.99, 49.99),
    (9, 'Azul Claro', 39.99, 49.99),
    
    -- Jeans Slim Fit (10)
    (10, 'Azul Oscuro', 44.99, 54.99),
    (10, 'Negro', 44.99, 54.99),
    
    -- Productos restantes...
    (11, 'Rojo', 12.99, 15.99),
    (12, 'Gris', 34.99, 44.99),
    (13, 'Azul', 59.99, 79.99),
    (14, 'Blanco', 69.99, 79.99),
    (15, 'Khaki', 27.99, 34.99),
    (16, 'Blanco', 9.99, 12.99);

-- Insertar imágenes de ejemplo para las variantes
INSERT INTO imagenes_variante (id_variante, url, public_id, orden) VALUES 
    (1, 'https://res.cloudinary.com/demo/image/upload/sample1.jpg', 'sample1', 1),
    (2, 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'sample2', 1),
    (3, 'https://res.cloudinary.com/demo/image/upload/sample3.jpg', 'sample3', 1),
    (4, 'https://res.cloudinary.com/demo/image/upload/sample4.jpg', 'sample4', 1),
    (5, 'https://res.cloudinary.com/demo/image/upload/sample5.jpg', 'sample5', 1),
    (6, 'https://res.cloudinary.com/demo/image/upload/sample6.jpg', 'sample6', 1),
    (7, 'https://res.cloudinary.com/demo/image/upload/sample7.jpg', 'sample7', 1),
    (8, 'https://res.cloudinary.com/demo/image/upload/sample8.jpg', 'sample8', 1),
    (9, 'https://res.cloudinary.com/demo/image/upload/sample9.jpg', 'sample9', 1),
    (10, 'https://res.cloudinary.com/demo/image/upload/sample10.jpg', 'sample10', 1),
    (11, 'https://res.cloudinary.com/demo/image/upload/sample11.jpg', 'sample11', 1),
    (12, 'https://res.cloudinary.com/demo/image/upload/sample12.jpg', 'sample12', 1),
    (13, 'https://res.cloudinary.com/demo/image/upload/sample13.jpg', 'sample13', 1),
    (14, 'https://res.cloudinary.com/demo/image/upload/sample14.jpg', 'sample14', 1),
    (15, 'https://res.cloudinary.com/demo/image/upload/sample15.jpg', 'sample15', 1),
    (16, 'https://res.cloudinary.com/demo/image/upload/sample16.jpg', 'sample16', 1);

-- Insertar stock para algunas combinaciones producto-variante-talla
INSERT INTO stock (id_producto, id_variante, id_talla, cantidad) VALUES 
    -- Camiseta Premium Sport - todas las tallas estándar
    (1, 1, 2, 15), -- S
    (1, 1, 3, 20), -- M
    (1, 1, 4, 25), -- L
    (1, 1, 5, 18), -- XL
    (1, 2, 2, 12), -- Rojo S
    (1, 2, 3, 22), -- Rojo M
    (1, 2, 4, 17), -- Rojo L
    (1, 3, 3, 30), -- Negro M
    (1, 3, 4, 25), -- Negro L
    (1, 3, 5, 20), -- Negro XL
    
    -- Pantalón Casual Denim
    (2, 4, 3, 15), -- Azul M
    (2, 4, 4, 20), -- Azul L
    (2, 5, 3, 10), -- Negro M
    (2, 5, 4, 12), -- Negro L
    
    -- Sneakers Urban Pro - tallas numéricas
    (3, 6, 9, 8),  -- Blanco/Negro 38
    (3, 6, 10, 12), -- Blanco/Negro 39
    (3, 6, 11, 15), -- Blanco/Negro 40
    (3, 7, 10, 10), -- Negro/Rojo 39
    (3, 7, 11, 14), -- Negro/Rojo 40
    
    -- Más stock para otros productos
    (4, 8, 3, 25),  -- Polo Navy M
    (4, 9, 4, 20),  -- Polo Blanco L
    (5, 10, 3, 30), -- Shorts Negro M
    (6, 13, 1, 50), -- Gorra (talla única, usando XS como referencia)
    (7, 14, 4, 8),  -- Chaqueta Verde L
    (8, 16, 11, 6); -- Zapatillas Running 40

-- Insertar promociones de ejemplo
INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, uso_maximo, activo) VALUES 
    ('2x1 en Camisetas', 'x_por_y', NOW(), NOW() + INTERVAL '30 days', 100, true),
    ('20% Off Verano', 'porcentaje', NOW(), NOW() + INTERVAL '60 days', NULL, true),
    ('Código BIENVENIDA', 'codigo', NOW(), NOW() + INTERVAL '90 days', 500, true),
    ('3x2 en Accesorios', 'x_por_y', NOW() + INTERVAL '7 days', NOW() + INTERVAL '37 days', 50, true),
    ('15% Off Zapatos', 'porcentaje', NOW(), NOW() + INTERVAL '45 days', NULL, true);

-- Insertar detalles de promociones x_por_y
INSERT INTO promo_x_por_y (id_promocion, cantidad_comprada, cantidad_pagada) VALUES 
    (1, 2, 1), -- 2x1
    (4, 3, 2); -- 3x2

-- Insertar detalles de promociones por porcentaje
INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES 
    (2, 20.00),
    (5, 15.00);

-- Insertar detalles de promociones con código
INSERT INTO promo_codigo (id_promocion, codigo, descuento, tipo_descuento) VALUES 
    (3, 'BIENVENIDA', 10.00, 'porcentaje');

-- Insertar aplicaciones de promociones
INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_categoria) VALUES 
    (1, 'categoria', 'Camisetas'),
    (2, 'todos', NULL),
    (4, 'categoria', 'Accesorios'),
    (5, 'categoria', 'Zapatos');

INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_producto) VALUES 
    (3, 'producto', 1), -- BIENVENIDA aplicable al producto 1
    (3, 'producto', 2); -- BIENVENIDA aplicable al producto 2

-- ==== CONFIGURACIONES POR DEFECTO DEL SITIO ====
-- Insertar configuraciones por defecto para el header
INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion) VALUES
('header_brand_name', 'TREBOLUXE', 'text', 'Nombre de la marca que aparece en el header'),
('header_promo_texts', '["ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN", "OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA"]', 'json', 'Textos promocionales rotativos del header')
ON CONFLICT (clave) DO NOTHING;

-- ==== IMÁGENES POR DEFECTO ====
-- Insertar imágenes por defecto para la página principal
INSERT INTO imagenes_principales (nombre, url, tipo, titulo, subtitulo, enlace, orden, activo) VALUES
('Hero Principal', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'hero_banner', 'NUEVA COLECCIÓN', 'Descubre los últimos trends en moda', '/catalogo', 1, true),
('Banner Promoción Verano', 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'promocion_banner', 'OFERTAS DE VERANO', '20% de descuento en segunda prenda', '/catalogo?promocion=verano', 1, true),
('Categoría Hombre', 'https://res.cloudinary.com/demo/image/upload/sample3.jpg', 'categoria_destacada', 'MODA MASCULINA', 'Estilo y elegancia para él', '/catalogo?categoria=hombre', 1, true),
('Categoría Mujer', 'https://res.cloudinary.com/demo/image/upload/sample4.jpg', 'categoria_destacada', 'MODA FEMENINA', 'Tendencias que definen tu estilo', '/catalogo?categoria=mujer', 2, true)
ON CONFLICT DO NOTHING;

-- ==== DATOS DE PRUEBA PARA PEDIDOS ====
-- Insertar métodos de envío
INSERT INTO metodos_envio (nombre, descripcion) VALUES 
    ('Estándar', 'Envío estándar de 3-5 días hábiles'),
    ('Express', 'Envío express de 1-2 días hábiles'),
    ('DHL', 'Envío vía DHL con rastreo completo'),
    ('FedEx', 'Envío vía FedEx nacional e internacional');

-- Insertar métodos de pago
INSERT INTO metodos_pago (nombre, descripcion) VALUES 
    ('Tarjeta de Crédito', 'Pago con tarjeta de crédito o débito'),
    ('PayPal', 'Pago seguro con PayPal'),
    ('Transferencia', 'Transferencia bancaria directa'),
    ('Contra Entrega', 'Pago al momento de la entrega');

-- Insertar usuarios de prueba
INSERT INTO usuarios (nombres, apellidos, correo, contrasena, usuario, rol) VALUES 
    ('Juan Carlos', 'Pérez López', 'juan.perez@example.com', '$2b$10$hash1', 'juanperez', 'user'),
    ('María Elena', 'García Martínez', 'maria.garcia@example.com', '$2b$10$hash2', 'mariagarcia', 'user'),
    ('Carlos', 'Rodríguez Silva', 'carlos.rodriguez@example.com', '$2b$10$hash3', 'carlosrodriguez', 'user'),
    ('Ana', 'Invitada', 'invitado@example.com', '$2b$10$hash4', 'invitado', 'user');

-- Insertar información de envío
INSERT INTO informacion_envio (id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais) VALUES 
    (1, 'Juan Carlos Pérez López', '555-0101', 'Av. Reforma 123, Col. Centro', 'Ciudad de México', 'CDMX', '06000', 'México'),
    (2, 'María Elena García Martínez', '555-0202', 'Calle Juárez 456, Col. Americana', 'Guadalajara', 'Jalisco', '44100', 'México'),
    (3, 'Carlos Rodríguez Silva', '555-0303', 'Blvd. Díaz Ordaz 789, Col. Santa María', 'Monterrey', 'Nuevo León', '64650', 'México');

-- Insertar pedidos de prueba con diferentes estados y fechas
INSERT INTO pedidos (id_usuario, id_informacion_envio, id_metodo_envio, id_metodo_pago, fecha_creacion, estado, total, notas) VALUES 
    -- Pedidos recientes
    (1, 1, 1, 1, NOW(), 'pendiente', 129.97, 'Pedido recién recibido, pendiente de procesamiento'),
    (2, 2, 2, 2, NOW() - INTERVAL '1 hour', 'procesando', 89.98, 'Verificando disponibilidad de productos'),
    (3, 3, 1, 1, NOW() - INTERVAL '3 hours', 'en_espera', 199.99, 'En espera de confirmación de pago'),
    
    -- Pedidos de ayer
    (1, 1, 3, 1, NOW() - INTERVAL '1 day', 'enviado', 79.99, 'Enviado vía DHL - Número de rastreo: DHL123456789'),
    (2, 2, 1, 3, NOW() - INTERVAL '1 day' + INTERVAL '2 hours', 'enviado', 149.98, 'Paquete en tránsito'),
    
    -- Pedidos de hace 2 días
    (3, 3, 2, 1, NOW() - INTERVAL '2 days', 'terminado', 59.99, 'Pedido entregado exitosamente'),
    (1, 1, 1, 2, NOW() - INTERVAL '2 days' + INTERVAL '5 hours', 'terminado', 299.97, 'Cliente confirmó recepción'),
    
    -- Pedidos con problemas
    (2, 2, 1, 1, NOW() - INTERVAL '3 days', 'problema', 89.99, 'Producto agotado, esperando restock para completar pedido'),
    (3, 3, 4, 4, NOW() - INTERVAL '1 week', 'problema', 199.99, 'Dirección incorrecta, contactar cliente para actualizar'),
    
    -- Pedidos más antiguos
    (1, 1, 1, 1, NOW() - INTERVAL '1 week', 'terminado', 129.97, 'Pedido completado sin incidencias'),
    (2, 2, 2, 2, NOW() - INTERVAL '2 weeks', 'terminado', 179.98, 'Cliente muy satisfecho con la compra'),
    (NULL, NULL, 1, 1, NOW() - INTERVAL '5 days', 'terminado', 49.99, 'Pedido de invitado completado exitosamente');

-- Insertar detalles de pedidos
INSERT INTO pedido_detalle (id_pedido, id_producto, id_variante, id_talla, cantidad, precio_unitario) VALUES 
    -- Pedido 1 (Juan Carlos - pendiente)
    (1, 1, 1, 3, 2, 29.99), -- 2x Camiseta Azul M
    (1, 3, 6, 11, 1, 89.99), -- 1x Sneakers Blanco/Negro 40
    
    -- Pedido 2 (María - procesando)
    (2, 2, 4, 4, 1, 49.99), -- 1x Pantalón Azul L
    (2, 4, 8, 3, 1, 24.99), -- 1x Polo Navy M
    
    -- Pedido 3 (Carlos - en espera)
    (3, 7, 14, 4, 1, 79.99), -- 1x Chaqueta Verde L
    (3, 8, 16, 11, 1, 119.99), -- 1x Zapatillas Running 40
    
    -- Pedido 4 (Juan Carlos - enviado)
    (4, 5, 10, 3, 2, 19.99), -- 2x Shorts Negro M
    (4, 6, 13, 1, 2, 15.99), -- 2x Gorra
    
    -- Pedido 5 (María - enviado)
    (5, 1, 2, 3, 3, 29.99), -- 3x Camiseta Roja M
    (5, 4, 9, 4, 2, 24.99), -- 2x Polo Blanco L
    
    -- Pedido 6 (Carlos - terminado)
    (6, 5, 11, 3, 3, 19.99), -- 3x Shorts M
    
    -- Pedido 7 (Juan Carlos - terminado)
    (7, 1, 1, 4, 5, 29.99), -- 5x Camiseta Azul L
    (7, 2, 5, 3, 3, 54.99), -- 3x Pantalón Negro M
    
    -- Más detalles para otros pedidos...
    (8, 3, 7, 10, 1, 89.99),
    (9, 8, 16, 11, 1, 199.99),
    (10, 1, 3, 4, 2, 32.99),
    (10, 4, 8, 4, 2, 24.99),
    (11, 2, 4, 3, 1, 49.99),
    (11, 5, 10, 3, 3, 19.99),
    (11, 6, 13, 1, 2, 15.99),
    (12, 1, 1, 3, 1, 29.99);

-- ==== DATOS DE PRUEBA PARA NOTAS GENERALES ====
-- Insertar notas generales de ejemplo
INSERT INTO notas_generales (titulo, contenido, prioridad, id_usuario_creador, nombre_usuario_creador, rol_usuario_creador, fecha_creacion, fecha_vencimiento, etiquetas, color) VALUES 
    -- Notas urgentes
    ('Sistema de Pagos - Mantenimiento', 
     'El sistema de pagos estará en mantenimiento el próximo viernes de 2:00 AM a 4:00 AM. Informar a todos los clientes y preparar mensaje en el sitio web.',
     'urgente', 
     1, 
     'Juan Carlos Pérez López',
     'admin',
     NOW() - INTERVAL '2 hours',
     NOW() + INTERVAL '3 days',
     ARRAY['mantenimiento', 'pagos', 'sistema'],
     'red'),
     
    ('Inventario Crítico - Sneakers Urban Pro',
     'El stock de Sneakers Urban Pro está por agotarse. Quedan menos de 10 unidades. Contactar al proveedor inmediatamente para realizar pedido urgente.',
     'urgente',
     2,
     'María Elena García Martínez',
     'admin',
     NOW() - INTERVAL '4 hours',
     NOW() + INTERVAL '1 day',
     ARRAY['inventario', 'stock', 'proveedor'],
     'orange'),
     
    -- Notas de alta prioridad
    ('Nueva Campaña Publicitaria',
     'Lanzar campaña de redes sociales para la nueva colección de verano. Presupuesto aprobado: $5,000. Coordinar con equipo de marketing.',
     'alta',
     1,
     'Juan Carlos Pérez López',
     'admin',
     NOW() - INTERVAL '1 day',
     NOW() + INTERVAL '7 days',
     ARRAY['marketing', 'campaña', 'redes sociales'],
     'purple'),
     
    ('Actualización de Precios Q2',
     'Revisar y actualizar precios de toda la línea de productos para el segundo trimestre. Considerar inflación y costos de proveedores.',
     'alta',
     3,
     'Carlos Rodríguez Silva',
     'admin',
     NOW() - INTERVAL '6 hours',
     NOW() + INTERVAL '2 weeks',
     ARRAY['precios', 'productos', 'trimestre'],
     'blue'),
     
    -- Notas normales
    ('Reunión Semanal de Ventas',
     'Reunión todos los lunes a las 10:00 AM para revisar métricas de ventas, pedidos pendientes y objetivos de la semana.',
     'normal',
     2,
     'María Elena García Martínez',
     'admin',
     NOW() - INTERVAL '2 days',
     NULL,
     ARRAY['reunión', 'ventas', 'semanal'],
     'green'),
     
    ('Capacitación Nuevo Sistema',
     'Programar capacitación para todo el equipo sobre las nuevas funcionalidades del sistema de gestión de pedidos implementado.',
     'normal',
     1,
     'Juan Carlos Pérez López',
     'admin',
     NOW() - INTERVAL '12 hours',
     NOW() + INTERVAL '10 days',
     ARRAY['capacitación', 'equipo', 'sistema'],
     'blue'),
     
    ('Feedback Cliente Premium',
     'El cliente premium Juan Carlos Pérez ha sugerido implementar un sistema de puntos por lealtad. Evaluar viabilidad y costos.',
     'normal',
     4,
     'Ana Invitada',
     'moderator',
     NOW() - INTERVAL '3 days',
     NOW() + INTERVAL '1 month',
     ARRAY['feedback', 'cliente', 'lealtad'],
     'yellow'),
     
    -- Notas de baja prioridad
    ('Actualizar Fotos de Productos',
     'Algunas fotos de productos están desactualizadas. Programar sesión fotográfica para productos de las categorías Camisetas y Pantalones.',
     'baja',
     2,
     'María Elena García Martínez',
     'admin',
     NOW() - INTERVAL '5 days',
     NOW() + INTERVAL '1 month',
     ARRAY['fotos', 'productos', 'actualización'],
     'default'),
     
    ('Optimizar SEO del Sitio Web',
     'Mejorar el SEO de las páginas de productos y categorías. Revisar meta descriptions, títulos y alt text de imágenes.',
     'baja',
     3,
     'Carlos Rodríguez Silva',
     'admin',
     NOW() - INTERVAL '1 week',
     NOW() + INTERVAL '2 months',
     ARRAY['SEO', 'web', 'optimización'],
     'default'),
     
    ('Evaluación Proveedores',
     'Realizar evaluación anual de todos los proveedores. Considerar calidad, precios, tiempos de entrega y servicio al cliente.',
     'baja',
     1,
     'Juan Carlos Pérez López',
     'admin',
     NOW() - INTERVAL '2 weeks',
     NOW() + INTERVAL '3 months',
     ARRAY['proveedores', 'evaluación', 'anual'],
     'default');

COMMIT;
