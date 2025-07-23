-- Script para recrear las tablas en el orden correcto sin datos adicionales

-- Eliminar tablas si existen (en orden inverso de dependencias)
DROP TABLE IF EXISTS imagenes_principales CASCADE;
DROP TABLE IF EXISTS configuraciones_sitio CASCADE;
DROP TABLE IF EXISTS imagenes_variante CASCADE;
DROP TABLE IF EXISTS variantes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS tallas CASCADE;
DROP TABLE IF EXISTS sistemas_talla CASCADE;
DROP TABLE IF EXISTS informacion_envio CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Crear extensión para UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    public_id VARCHAR(150) NOT NULL
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
