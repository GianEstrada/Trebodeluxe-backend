-- Migración: Agregar columna hs_code a tabla categorias
-- Fecha: 7 de septiembre de 2025
-- Descripción: Agregar soporte para códigos armonizados internacionales

-- Agregar columna hs_code a la tabla categorias
ALTER TABLE categorias 
ADD COLUMN hs_code VARCHAR(15) DEFAULT NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN categorias.hs_code IS 'Código del Sistema Armonizado para envíos internacionales (formato: 0000.00.0000)';

-- Crear índice para consultas rápidas por HS code
CREATE INDEX idx_categorias_hs_code ON categorias(hs_code);

-- Actualizar categorías existentes con códigos HS comunes para textiles/ropa
-- Estos son códigos HS válidos y genéricos para productos textiles

-- Playeras, camisetas, polos (algodón)
UPDATE categorias 
SET hs_code = '6109.90.00' 
WHERE nombre ILIKE '%playera%' 
   OR nombre ILIKE '%camiseta%' 
   OR nombre ILIKE '%polo%'
   OR nombre ILIKE '%t-shirt%';

-- Pantalones, jeans (algodón)
UPDATE categorias 
SET hs_code = '6203.42.40' 
WHERE nombre ILIKE '%pantalon%' 
   OR nombre ILIKE '%jean%' 
   OR nombre ILIKE '%pants%';

-- Sudaderas, hoodies (algodón)
UPDATE categorias 
SET hs_code = '6110.20.20' 
WHERE nombre ILIKE '%sudadera%' 
   OR nombre ILIKE '%hoodie%' 
   OR nombre ILIKE '%sweatshirt%';

-- Shorts (algodón)
UPDATE categorias 
SET hs_code = '6203.43.40' 
WHERE nombre ILIKE '%short%' 
   OR nombre ILIKE '%bermuda%';

-- Vestidos (algodón)
UPDATE categorias 
SET hs_code = '6204.42.00' 
WHERE nombre ILIKE '%vestido%' 
   OR nombre ILIKE '%dress%';

-- Accesorios textiles (gorras, sombreros)
UPDATE categorias 
SET hs_code = '6505.00.90' 
WHERE nombre ILIKE '%gorra%' 
   OR nombre ILIKE '%sombrero%' 
   OR nombre ILIKE '%cap%' 
   OR nombre ILIKE '%hat%';

-- Calcetines, medias
UPDATE categorias 
SET hs_code = '6115.95.90' 
WHERE nombre ILIKE '%calcet%' 
   OR nombre ILIKE '%media%' 
   OR nombre ILIKE '%sock%';

-- Ropa interior (algodón)
UPDATE categorias 
SET hs_code = '6108.32.00' 
WHERE nombre ILIKE '%ropa interior%' 
   OR nombre ILIKE '%boxer%' 
   OR nombre ILIKE '%underwear%';

-- Verificar resultados
SELECT 
    id_categoria,
    nombre,
    hs_code,
    CASE 
        WHEN hs_code IS NULL THEN 'SIN CÓDIGO HS'
        ELSE 'CON CÓDIGO HS'
    END as status_hs
FROM categorias 
ORDER BY nombre;
