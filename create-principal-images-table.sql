-- Migración para nueva tabla de imágenes principales con sistema de posicionamiento
-- Fecha: 2025-07-23

-- Crear nueva tabla para imágenes principales con posicionamiento
DROP TABLE IF EXISTS imagenes_principales_nuevas CASCADE;

CREATE TABLE imagenes_principales_nuevas (
    id_imagen SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    url VARCHAR(500) NOT NULL,
    public_id VARCHAR(200) NOT NULL,
    posicion VARCHAR(20) NOT NULL DEFAULT 'inactiva' CHECK (posicion IN ('inactiva', 'izquierda', 'derecha')),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(posicion) DEFERRABLE INITIALLY DEFERRED -- Solo una imagen por posición (excepto inactiva)
);

-- Función para actualizar fecha de modificación
CREATE OR REPLACE FUNCTION actualizar_fecha_imagenes_principales()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha
DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes_principales ON imagenes_principales_nuevas;
CREATE TRIGGER trigger_actualizar_fecha_imagenes_principales
    BEFORE UPDATE ON imagenes_principales_nuevas
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_imagenes_principales();

-- Función para manejar el posicionamiento único
CREATE OR REPLACE FUNCTION validar_posicion_unica()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la nueva posición es 'izquierda' o 'derecha'
    IF NEW.posicion IN ('izquierda', 'derecha') THEN
        -- Cambiar cualquier imagen existente en esa posición a 'inactiva'
        UPDATE imagenes_principales_nuevas 
        SET posicion = 'inactiva' 
        WHERE posicion = NEW.posicion AND id_imagen != NEW.id_imagen;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar posicionamiento único
DROP TRIGGER IF EXISTS trigger_validar_posicion_unica ON imagenes_principales_nuevas;
CREATE TRIGGER trigger_validar_posicion_unica
    BEFORE INSERT OR UPDATE ON imagenes_principales_nuevas
    FOR EACH ROW EXECUTE FUNCTION validar_posicion_unica();

-- Índices para optimización
CREATE INDEX idx_imagenes_principales_nuevas_posicion ON imagenes_principales_nuevas(posicion);
CREATE INDEX idx_imagenes_principales_nuevas_activo ON imagenes_principales_nuevas(activo);
CREATE INDEX idx_imagenes_principales_nuevas_orden ON imagenes_principales_nuevas(orden);
CREATE INDEX idx_imagenes_principales_nuevas_nombre ON imagenes_principales_nuevas(nombre);

-- Comentarios para documentación
COMMENT ON TABLE imagenes_principales_nuevas IS 'Tabla para gestionar imágenes principales del sitio con sistema de posicionamiento';
COMMENT ON COLUMN imagenes_principales_nuevas.posicion IS 'Posición de la imagen: inactiva, izquierda, derecha. Solo una imagen por posición activa';
COMMENT ON COLUMN imagenes_principales_nuevas.orden IS 'Orden de visualización para imágenes inactivas';
