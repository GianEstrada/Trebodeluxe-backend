-- Migración para crear tabla de códigos de descuento
-- Separando los códigos promocionales de las promociones de productos

CREATE TABLE IF NOT EXISTS codigos_descuento (
  id_codigo SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  tipo_descuento VARCHAR(20) NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'monto_fijo')),
  valor_descuento DECIMAL(10,2) NOT NULL,
  monto_minimo DECIMAL(10,2) DEFAULT 0,
  usos_maximos INTEGER DEFAULT NULL,
  usos_actuales INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_fin TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_codigos_descuento_codigo ON codigos_descuento(codigo);
CREATE INDEX IF NOT EXISTS idx_codigos_descuento_activo ON codigos_descuento(activo);
CREATE INDEX IF NOT EXISTS idx_codigos_descuento_fechas ON codigos_descuento(fecha_inicio, fecha_fin);

-- Insertar algunos códigos de ejemplo
INSERT INTO codigos_descuento (codigo, descripcion, tipo_descuento, valor_descuento, monto_minimo, usos_maximos) 
VALUES 
  ('WELCOME10', 'Descuento de bienvenida 10%', 'porcentaje', 10.00, 100.00, 100),
  ('SAVE20', 'Descuento 20% en compras mayores a $500', 'porcentaje', 20.00, 500.00, 50),
  ('FIXED50', 'Descuento fijo de $50', 'monto_fijo', 50.00, 200.00, NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE codigos_descuento IS 'Tabla para códigos de descuento utilizados en checkout';
COMMENT ON COLUMN codigos_descuento.tipo_descuento IS 'Tipo de descuento: porcentaje o monto_fijo';
COMMENT ON COLUMN codigos_descuento.valor_descuento IS 'Valor del descuento (porcentaje o monto fijo)';
COMMENT ON COLUMN codigos_descuento.monto_minimo IS 'Monto mínimo de compra para aplicar el código';
COMMENT ON COLUMN codigos_descuento.usos_maximos IS 'Número máximo de usos del código (NULL = ilimitado)';
COMMENT ON COLUMN codigos_descuento.usos_actuales IS 'Número de veces que se ha usado el código';
