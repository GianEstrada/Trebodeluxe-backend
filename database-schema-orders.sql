-- Script para crear las tablas de órdenes y configuración de shipper

-- 1. Tabla de configuración del shipper (remitente)
CREATE TABLE IF NOT EXISTS shipper_config (
    id_shipper SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL DEFAULT 'Inversiones Montgomery Burns S.A.S de C.V.',
    person_name VARCHAR(200) NOT NULL DEFAULT 'Homero Simpson',
    address VARCHAR(500) NOT NULL DEFAULT 'Vía Industrial',
    internal_number VARCHAR(50) DEFAULT '100',
    reference VARCHAR(200) DEFAULT 'Planta nuclear',
    sector VARCHAR(100) DEFAULT 'Asarco',
    city VARCHAR(100) NOT NULL DEFAULT 'Monterrey',
    state VARCHAR(100) NOT NULL DEFAULT 'Nuevo León',
    postal_code VARCHAR(10) NOT NULL DEFAULT '64550',
    country VARCHAR(2) NOT NULL DEFAULT 'MX',
    phone VARCHAR(20) NOT NULL DEFAULT '4434434444',
    email VARCHAR(100) NOT NULL DEFAULT 'homero@burns.com',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla principal de órdenes
CREATE TABLE IF NOT EXISTS ordenes (
    id_orden SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL, -- Puede ser NULL para órdenes anónimas
    id_informacion_envio INTEGER REFERENCES informacion_envio(id_informacion) ON DELETE CASCADE,
    numero_referencia VARCHAR(15) UNIQUE NOT NULL, -- 15 caracteres aleatorios únicos
    metodo_envio VARCHAR(100) NOT NULL, -- Método seleccionado por el usuario
    costo_envio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL, -- Precio total sin envío ni IVA
    iva DECIMAL(10,2) NOT NULL, -- IVA del 16%
    total DECIMAL(10,2) NOT NULL, -- Subtotal + IVA + envío
    moneda VARCHAR(3) NOT NULL DEFAULT 'MXN', -- USD, MXN, EUR, etc.
    tasa_cambio DECIMAL(10,4) DEFAULT 1.0000, -- Tasa de cambio utilizada
    stripe_payment_intent_id VARCHAR(200), -- ID del payment intent de Stripe
    stripe_payment_status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed
    skydropx_order_id VARCHAR(100), -- ID de la orden en SkyDropX
    skydropx_status VARCHAR(50) DEFAULT 'pending', -- pending, created, shipped, delivered
    estado_orden VARCHAR(50) DEFAULT 'procesando', -- procesando, enviado, entregado, cancelado
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de detalles de la orden (items comprados)
CREATE TABLE IF NOT EXISTS pedido_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INTEGER REFERENCES ordenes(id_orden) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL,
    id_variante INTEGER NOT NULL,
    id_talla INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal_item DECIMAL(10,2) NOT NULL, -- cantidad * precio_unitario
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para mejorar rendimiento
    FOREIGN KEY (id_producto, id_variante) REFERENCES variantes_producto(id_producto, id_variante),
    FOREIGN KEY (id_producto, id_variante, id_talla) REFERENCES tallas_variante(id_producto, id_variante, id_talla)
);

-- 4. Insertar configuración por defecto del shipper
INSERT INTO shipper_config (
    company_name, person_name, address, internal_number, reference, 
    sector, city, state, postal_code, country, phone, email
) VALUES (
    'Trebo de Luxe S.A. de C.V.',
    'Administrador Trebo',
    'Vía Industrial',
    '100',
    'Oficinas principales',
    'Zona Industrial',
    'Monterrey',
    'Nuevo León',
    '64550',
    'MX',
    '8181234567',
    'admin@trebodeluxe.com'
) ON CONFLICT DO NOTHING;

-- 5. Función para generar número de referencia único
CREATE OR REPLACE FUNCTION generate_reference_number() RETURNS VARCHAR(15) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
    exists_check INTEGER;
BEGIN
    LOOP
        result := '';
        -- Generar 15 caracteres aleatorios
        FOR i IN 1..15 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Verificar que no exista
        SELECT COUNT(*) INTO exists_check FROM ordenes WHERE numero_referencia = result;
        
        -- Si no existe, salir del loop
        IF exists_check = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para actualizar fecha de modificación
CREATE OR REPLACE FUNCTION update_orden_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orden_timestamp
    BEFORE UPDATE ON ordenes
    FOR EACH ROW
    EXECUTE FUNCTION update_orden_timestamp();

-- 7. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario ON ordenes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ordenes_referencia ON ordenes(numero_referencia);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_ordenes_stripe_intent ON ordenes(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_orden ON pedido_detalle(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_producto ON pedido_detalle(id_producto, id_variante, id_talla);

-- 8. Función para calcular totales de orden
CREATE OR REPLACE FUNCTION calculate_order_totals(order_id INTEGER) 
RETURNS TABLE(subtotal DECIMAL, iva_amount DECIMAL, total_with_iva DECIMAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(pd.subtotal_item), 0.00) as subtotal,
        COALESCE(SUM(pd.subtotal_item), 0.00) * 0.16 as iva_amount,
        COALESCE(SUM(pd.subtotal_item), 0.00) * 1.16 as total_with_iva
    FROM pedido_detalle pd
    WHERE pd.id_pedido = order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ordenes IS 'Tabla principal de órdenes del sistema';
COMMENT ON TABLE pedido_detalle IS 'Detalles de los items comprados en cada orden';
COMMENT ON TABLE shipper_config IS 'Configuración del remitente para envíos SkyDropX';
COMMENT ON FUNCTION generate_reference_number() IS 'Genera número de referencia único de 15 caracteres';
COMMENT ON FUNCTION calculate_order_totals(INTEGER) IS 'Calcula subtotal, IVA y total de una orden';
