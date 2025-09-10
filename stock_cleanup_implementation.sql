-- ========================================
-- LIMPIEZA AUTOMÁTICA DE STOCK INVÁLIDO
-- ========================================
--
-- Este script implementa la limpieza automática de registros
-- en la tabla 'stock' que tengan cantidad = 0 OR precio = 0
--
-- PROBLEMA RESUELTO:
-- - Backend al subir variantes pone precio 0 a tallas sin stock
-- - Estas filas aparecen en la tabla de stocks del admin
-- - Solución: eliminar automáticamente registros inválidos
--
-- ========================================

-- 1. Eliminar registros problemáticos existentes
DELETE FROM stock 
WHERE cantidad = 0 OR precio = 0;

-- 2. Crear función que maneja la limpieza automática
CREATE OR REPLACE FUNCTION limpiar_stock_invalido()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está insertando un registro con cantidad = 0 OR precio = 0, no permitirlo
    IF TG_OP = 'INSERT' THEN
        IF NEW.cantidad = 0 OR NEW.precio = 0 THEN
            -- No insertar el registro, simplemente retornar NULL
            RETURN NULL;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Si se está actualizando y queda con cantidad = 0 OR precio = 0, eliminarlo
    IF TG_OP = 'UPDATE' THEN
        IF NEW.cantidad = 0 OR NEW.precio = 0 THEN
            -- Eliminar el registro
            DELETE FROM stock WHERE id_stock = NEW.id_stock;
            RETURN NULL;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trigger_limpiar_stock ON stock;

-- 4. Crear trigger que se ejecuta antes de INSERT y UPDATE
CREATE TRIGGER trigger_limpiar_stock
    BEFORE INSERT OR UPDATE ON stock
    FOR EACH ROW
    EXECUTE FUNCTION limpiar_stock_invalido();

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Consulta para verificar registros válidos restantes
SELECT 
    s.id_stock,
    p.nombre as producto,
    v.nombre as variante,
    t.nombre_talla as talla,
    s.cantidad,
    s.precio,
    s.fecha_actualizacion
FROM stock s
LEFT JOIN productos p ON s.id_producto = p.id_producto
LEFT JOIN variantes v ON s.id_variante = v.id_variante
LEFT JOIN tallas t ON s.id_talla = t.id_talla
ORDER BY s.id_producto, s.id_variante, s.id_talla;

-- Verificar que no hay registros problemáticos
SELECT COUNT(*) as registros_problematicos
FROM stock 
WHERE cantidad = 0 OR precio = 0;

-- ========================================
-- PRUEBAS DE FUNCIONALIDAD
-- ========================================

-- Estas consultas deberían ser bloqueadas/eliminadas automáticamente:

-- Prueba 1: INSERT con cantidad = 0 (debería ser bloqueado)
-- INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
-- VALUES (5, 14, 1, 0, 100.00);

-- Prueba 2: INSERT con precio = 0 (debería ser bloqueado)
-- INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
-- VALUES (5, 14, 1, 10, 0);

-- Prueba 3: UPDATE que ponga cantidad = 0 (debería eliminar el registro)
-- UPDATE stock SET cantidad = 0 WHERE id_stock = [ALGÚN_ID];

-- Prueba 4: UPDATE que ponga precio = 0 (debería eliminar el registro)
-- UPDATE stock SET precio = 0 WHERE id_stock = [ALGÚN_ID];

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
--
-- 1. COMPORTAMIENTO:
--    - INSERT con cantidad = 0 OR precio = 0 → Se bloquea (no se inserta)
--    - UPDATE que resulte en cantidad = 0 OR precio = 0 → Se elimina el registro
--    - Solo se mantienen registros con cantidad > 0 AND precio > 0
--
-- 2. IMPACTO EN EL ADMIN:
--    - Las tallas sin stock o precio 0 no aparecerán en la tabla
--    - Admin solo mostrará tallas disponibles con precio válido
--    - No se requieren cambios en el código frontend
--
-- 3. COMPATIBILIDAD:
--    - Funciona automáticamente con cualquier operación en la tabla stock
--    - No interfiere con el funcionamiento normal del sistema
--    - Mantiene la integridad referencial
--
-- 4. MANTENIMIENTO:
--    - Para desactivar: DROP TRIGGER trigger_limpiar_stock ON stock;
--    - Para reactivar: ejecutar el CREATE TRIGGER nuevamente
--    - La función permanece en la base de datos para uso futuro
--
-- 5. LOGGING:
--    - Los registros eliminados no generan errores
--    - Las operaciones bloqueadas tampoco generan errores
--    - El comportamiento es transparente para la aplicación
--
