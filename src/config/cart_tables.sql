-- Nuevas tablas para el sistema de carrito de compras

-- Tabla principal del carrito
CREATE TABLE IF NOT EXISTS carritos (
    id_carrito SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    token_sesion VARCHAR(100), -- Para usuarios no logueados
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Solo uno de los dos debe tener valor (usuario logueado o token de sesión)
    CHECK ((id_usuario IS NOT NULL AND token_sesion IS NULL) OR (id_usuario IS NULL AND token_sesion IS NOT NULL))
);

-- Tabla de contenido del carrito
CREATE TABLE IF NOT EXISTS contenido_carrito (
    id_contenido SERIAL PRIMARY KEY,
    id_carrito INTEGER NOT NULL REFERENCES carritos(id_carrito) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    id_variante INTEGER NOT NULL REFERENCES variantes(id_variante) ON DELETE CASCADE,
    id_talla INTEGER NOT NULL REFERENCES tallas(id_talla) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Evitar duplicados del mismo producto/variante/talla en el mismo carrito
    UNIQUE(id_carrito, id_producto, id_variante, id_talla)
);

-- Función para actualizar fecha de modificación del carrito
CREATE OR REPLACE FUNCTION actualizar_fecha_carrito()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar la fecha del carrito cuando se modifica el contenido
    UPDATE carritos 
    SET fecha_actualizacion = CURRENT_TIMESTAMP 
    WHERE id_carrito = COALESCE(NEW.id_carrito, OLD.id_carrito);
    
    -- Si es UPDATE del contenido, actualizar su propia fecha
    IF TG_OP = 'UPDATE' THEN
        NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers para mantener las fechas actualizadas
DROP TRIGGER IF EXISTS trigger_actualizar_fecha_contenido_carrito ON contenido_carrito;
CREATE TRIGGER trigger_actualizar_fecha_contenido_carrito
    AFTER INSERT OR UPDATE OR DELETE ON contenido_carrito
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_carrito();

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_carritos_usuario ON carritos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_carritos_token ON carritos(token_sesion);
CREATE INDEX IF NOT EXISTS idx_carritos_fecha_actualizacion ON carritos(fecha_actualizacion);
CREATE INDEX IF NOT EXISTS idx_contenido_carrito_carrito ON contenido_carrito(id_carrito);
CREATE INDEX IF NOT EXISTS idx_contenido_carrito_producto ON contenido_carrito(id_producto);
CREATE INDEX IF NOT EXISTS idx_contenido_carrito_variante ON contenido_carrito(id_variante);
CREATE INDEX IF NOT EXISTS idx_contenido_carrito_talla ON contenido_carrito(id_talla);

-- Función para limpiar carritos antiguos (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION limpiar_carritos_antiguos()
RETURNS void AS $$
BEGIN
    -- Eliminar carritos de usuarios no logueados que no se han actualizado en 30 días
    DELETE FROM carritos 
    WHERE token_sesion IS NOT NULL 
    AND fecha_actualizacion < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Eliminar carritos vacíos (sin contenido) que tengan más de 7 días
    DELETE FROM carritos 
    WHERE id_carrito NOT IN (SELECT DISTINCT id_carrito FROM contenido_carrito)
    AND fecha_creacion < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
