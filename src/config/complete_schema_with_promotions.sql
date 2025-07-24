-- complete_schema_with_promotions_and_orders.sql - Esquema completo actualizado con pedidos y envíos

-- Crear extensión para UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas si existen (en orden inverso de dependencias)
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
DROP TABLE IF EXISTS imagenes_index CASCADE;
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

-- ==== IMÁGENES INDEX DEL SITIO ====

CREATE TABLE imagenes_index (
    id_imagen SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    public_id VARCHAR(200),
    seccion VARCHAR(50) NOT NULL CHECK (seccion IN ('principal', 'banner')),
    descripcion TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'inactivo' CHECK (estado IN ('activo', 'inactivo', 'izquierda', 'derecha')),
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

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes ON imagenes_index;
CREATE TRIGGER trigger_actualizar_fecha_imagenes
    BEFORE UPDATE ON imagenes_index
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
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, enviado, entregado, cancelado, etc.
    total NUMERIC(10,2),
    token_sesion VARCHAR(100) -- Para pedidos de invitados sin cuenta
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

-- ==== ÍNDICES PARA RENDIMIENTO ====

CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX idx_informacion_envio_usuario ON informacion_envio(id_usuario);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_fecha ON productos(fecha_creacion);
CREATE INDEX idx_variantes_producto ON variantes(id_producto);
CREATE INDEX idx_variantes_activo ON variantes(activo);
CREATE INDEX idx_imagenes_variante_variante ON imagenes_variante(id_variante);
CREATE INDEX idx_imagenes_variante_orden ON imagenes_variante(orden);
CREATE INDEX idx_stock_producto ON stock(id_producto);
CREATE INDEX idx_stock_variante ON stock(id_variante);
CREATE INDEX idx_stock_talla ON stock(id_talla);
CREATE INDEX idx_promociones_activo ON promociones(activo);
CREATE INDEX idx_promociones_fechas ON promociones(fecha_inicio, fecha_fin);
CREATE INDEX idx_promocion_aplicacion_tipo ON promocion_aplicacion(tipo_objetivo);
CREATE INDEX idx_promocion_aplicacion_categoria ON promocion_aplicacion(id_categoria);
CREATE INDEX idx_promocion_aplicacion_producto ON promocion_aplicacion(id_producto);
CREATE INDEX idx_imagenes_index_seccion ON imagenes_index(seccion);
CREATE INDEX idx_imagenes_index_estado ON imagenes_index(estado);
CREATE INDEX idx_notas_generales_prioridad ON notas_generales(prioridad);
CREATE INDEX idx_notas_generales_fecha_creacion ON notas_generales(fecha_creacion);
CREATE INDEX idx_notas_generales_activo ON notas_generales(activo);
CREATE INDEX idx_notas_generales_usuario_creador ON notas_generales(id_usuario_creador);
CREATE INDEX idx_notas_generales_fecha_vencimiento ON notas_generales(fecha_vencimiento);

COMMIT;
