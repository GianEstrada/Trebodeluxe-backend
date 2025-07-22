-- Migración para crear tabla de configuraciones del sitio
-- Archivo: create_site_settings.sql

-- Crear tabla para configuraciones del sitio
CREATE TABLE IF NOT EXISTS configuraciones_sitio (
    id_configuracion SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50) DEFAULT 'text', -- 'text', 'json', 'number', 'boolean'
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuraciones por defecto para el header
INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion) VALUES
('header_brand_name', 'TREBOLUXE', 'text', 'Nombre de la marca que aparece en el header'),
('header_promo_texts', '["ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN", "OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA"]', 'json', 'Textos promocionales rotativos del header')
ON CONFLICT (clave) DO NOTHING;

-- Función para actualizar fecha de modificación automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar fecha automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_fecha_configuraciones ON configuraciones_sitio;
CREATE TRIGGER trigger_actualizar_fecha_configuraciones
    BEFORE UPDATE ON configuraciones_sitio
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

-- Comentarios de la tabla
COMMENT ON TABLE configuraciones_sitio IS 'Tabla para almacenar configuraciones generales del sitio web';
COMMENT ON COLUMN configuraciones_sitio.clave IS 'Identificador único de la configuración';
COMMENT ON COLUMN configuraciones_sitio.valor IS 'Valor de la configuración almacenado como texto';
COMMENT ON COLUMN configuraciones_sitio.tipo IS 'Tipo de dato para validación (text, json, number, boolean)';
COMMENT ON COLUMN configuraciones_sitio.descripcion IS 'Descripción de qué hace esta configuración';
