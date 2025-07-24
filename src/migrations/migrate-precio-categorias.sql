-- Migración: Mover precio de variantes a stock y agregar gestión de categorías
-- Fecha: 2025-07-24

BEGIN;

-- 1. CREAR TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AGREGAR COLUMNAS DE PRECIO A LA TABLA STOCK
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'precio') THEN
        ALTER TABLE stock ADD COLUMN precio NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'precio_original') THEN
        ALTER TABLE stock ADD COLUMN precio_original NUMERIC(10,2);
    END IF;
END $$;

-- 3. MIGRAR DATOS DE PRECIOS DE VARIANTES A STOCK
UPDATE stock 
SET precio = v.precio, precio_original = v.precio_original
FROM variantes v
WHERE stock.id_variante = v.id_variante 
AND stock.precio IS NULL;

-- 4. CREAR FUNCIÓN PARA MIGRAR DATOS EXISTENTES
CREATE OR REPLACE FUNCTION migrar_precios_variantes_a_stock()
RETURNS void AS $$
DECLARE
    variante_record RECORD;
    stock_record RECORD;
BEGIN
    -- Iterar sobre todas las variantes
    FOR variante_record IN SELECT id_variante, precio, precio_original FROM variantes LOOP
        -- Actualizar todos los stocks de esta variante con el precio de la variante
        UPDATE stock 
        SET 
            precio = variante_record.precio,
            precio_original = variante_record.precio_original
        WHERE id_variante = variante_record.id_variante
        AND (precio IS NULL OR precio = 0);
    END LOOP;
    
    RAISE NOTICE 'Migración de precios completada';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la migración
SELECT migrar_precios_variantes_a_stock();

-- 5. INSERTAR CATEGORÍAS POR DEFECTO
INSERT INTO categorias (nombre, descripcion, orden) VALUES
('Camisetas', 'Camisetas y playeras de diferentes estilos', 1),
('Polos', 'Polos y camisas polo', 2),
('Zapatos', 'Calzado deportivo y casual', 3),
('Gorras', 'Gorras y sombreros', 4),
('Accesorios', 'Accesorios varios y complementos', 5),
('Pantalones', 'Pantalones y jeans', 6)
ON CONFLICT (nombre) DO NOTHING;

-- 6. ACTUALIZAR TABLA PRODUCTOS PARA USAR ID DE CATEGORÍA
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'id_categoria') THEN
        ALTER TABLE productos ADD COLUMN id_categoria INTEGER REFERENCES categorias(id_categoria);
    END IF;
END $$;

-- 7. MIGRAR CATEGORÍAS EXISTENTES
UPDATE productos 
SET id_categoria = c.id_categoria
FROM categorias c
WHERE productos.categoria = c.nombre
AND productos.id_categoria IS NULL;

-- 8. CREAR TRIGGER PARA ACTUALIZAR FECHA DE MODIFICACIÓN EN CATEGORÍAS
CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion_categorias()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_categorias ON categorias;
CREATE TRIGGER trigger_actualizar_fecha_categorias
    BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion_categorias();

-- 9. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_stock_precio ON stock(precio);
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_orden ON categorias(orden);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(id_categoria);

-- 10. AGREGAR RESTRICCIONES
ALTER TABLE stock ADD CONSTRAINT check_precio_positivo CHECK (precio IS NULL OR precio >= 0);
ALTER TABLE stock ADD CONSTRAINT check_precio_original_positivo CHECK (precio_original IS NULL OR precio_original >= 0);

COMMIT;

-- Verificar la migración
SELECT 
    'Categorías creadas' as tabla,
    COUNT(*) as registros
FROM categorias
UNION ALL
SELECT 
    'Stock con precios' as tabla,
    COUNT(*) as registros
FROM stock 
WHERE precio IS NOT NULL;
