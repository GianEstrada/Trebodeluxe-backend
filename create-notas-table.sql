-- Crear tabla notas_generales

CREATE TABLE IF NOT EXISTS notas_generales (
    id_nota SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    id_usuario_creador INTEGER REFERENCES usuarios(id_usuario),
    nombre_usuario_creador VARCHAR(255),
    rol_usuario_creador VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento TIMESTAMP,
    etiquetas TEXT[], -- Array de etiquetas
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color en formato hex
    activo BOOLEAN DEFAULT true,
    completado BOOLEAN DEFAULT false,
    fecha_completado TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_notas_generales_prioridad ON notas_generales(prioridad);
CREATE INDEX IF NOT EXISTS idx_notas_generales_fecha_creacion ON notas_generales(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_notas_generales_activo ON notas_generales(activo);
CREATE INDEX IF NOT EXISTS idx_notas_generales_usuario_creador ON notas_generales(id_usuario_creador);
CREATE INDEX IF NOT EXISTS idx_notas_generales_fecha_vencimiento ON notas_generales(fecha_vencimiento);

-- Insertar algunas notas de ejemplo
INSERT INTO notas_generales (titulo, contenido, prioridad, nombre_usuario_creador, rol_usuario_creador) VALUES
('Nota de prueba 1', 'Esta es una nota de prueba con prioridad alta', 'alta', 'Admin', 'admin'),
('Nota de prueba 2', 'Esta es una nota de prueba con prioridad normal', 'normal', 'Admin', 'admin'),
('Nota urgente', 'Esta es una nota urgente que requiere atención inmediata', 'urgente', 'Admin', 'admin')
ON CONFLICT DO NOTHING;
