-- ========================================
-- IMPLEMENTACIÓN AUTOMÁTICA DE SEGURO_ENVIO
-- ========================================
-- 
-- Este script implementa la lógica automática para determinar
-- el valor de seguro_envio basándose en la comparación:
-- 
-- Si (subtotal + iva + costo_envio) = total → seguro_envio = false
-- Si (subtotal + iva + costo_envio) < total → seguro_envio = true
--
-- ========================================

-- 1. Crear la función que calcula el seguro_envio
CREATE OR REPLACE FUNCTION actualizar_seguro_envio()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular si la suma de costos es igual al total
    -- Si suma = total, entonces seguro_envio = false
    -- Si suma < total, entonces seguro_envio = true
    
    NEW.seguro_envio := (NEW.subtotal + NEW.iva + NEW.costo_envio) < NEW.total;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trigger_seguro_envio ON ordenes;

-- 3. Crear el trigger que se ejecuta antes de INSERT y UPDATE
CREATE TRIGGER trigger_seguro_envio
    BEFORE INSERT OR UPDATE ON ordenes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_seguro_envio();

-- 4. Actualizar registros existentes para aplicar la nueva lógica
UPDATE ordenes 
SET seguro_envio = (subtotal + iva + costo_envio) < total
WHERE id_orden IS NOT NULL;

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Consulta para verificar los resultados
SELECT 
    id_orden,
    numero_referencia,
    subtotal,
    iva, 
    costo_envio,
    (subtotal + iva + costo_envio) as suma_calculada,
    total,
    seguro_envio,
    CASE 
        WHEN (subtotal + iva + costo_envio) = total THEN 'SIN SEGURO'
        WHEN (subtotal + iva + costo_envio) < total THEN 'CON SEGURO'
        ELSE 'ERROR'
    END as estado_seguro
FROM ordenes 
ORDER BY id_orden DESC;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
--
-- 1. El trigger se ejecuta automáticamente en:
--    - INSERT: Al insertar nuevas órdenes
--    - UPDATE: Al actualizar órdenes existentes
--
-- 2. La lógica es:
--    - Si los costos suman exactamente igual al total = NO hay seguro
--    - Si los costos suman menos que el total = SÍ hay seguro
--    - La diferencia representa el costo del seguro de envío
--
-- 3. No es necesario modificar el código de la aplicación,
--    la base de datos maneja esto automáticamente
--
-- 4. Para desactivar esta funcionalidad:
--    DROP TRIGGER trigger_seguro_envio ON ordenes;
--    DROP FUNCTION actualizar_seguro_envio();
--
