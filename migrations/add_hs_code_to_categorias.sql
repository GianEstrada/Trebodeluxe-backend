-- Migración: Agregar columna hs_code a tabla categorias
-- Fecha: 7 de septiembre de 2025
-- Propósito: Soporte para códigos arancelarios en envíos internacionales

-- Agregar columna hs_code a la tabla categorias
ALTER TABLE categorias 
ADD COLUMN hs_code VARCHAR(20);

-- Agregar comentario a la columna
COMMENT ON COLUMN categorias.hs_code IS 'Código del Sistema Armonizado (HS) para clasificación arancelaria internacional';

-- Valores por defecto para categorías existentes (códigos HS comunes para ropa)
UPDATE categorias SET hs_code = '6109.10.00' WHERE nombre ILIKE '%playera%' OR nombre ILIKE '%camiseta%' OR nombre ILIKE '%t-shirt%';
UPDATE categorias SET hs_code = '6110.20.00' WHERE nombre ILIKE '%sueter%' OR nombre ILIKE '%hoodie%' OR nombre ILIKE '%sudadera%';
UPDATE categorias SET hs_code = '6203.42.00' WHERE nombre ILIKE '%pantalon%' OR nombre ILIKE '%jeans%' OR nombre ILIKE '%short%';
UPDATE categorias SET hs_code = '6204.62.00' WHERE nombre ILIKE '%falda%' OR nombre ILIKE '%vestido%';
UPDATE categorias SET hs_code = '6505.00.00' WHERE nombre ILIKE '%gorra%' OR nombre ILIKE '%sombrero%' OR nombre ILIKE '%cap%';
UPDATE categorias SET hs_code = '6402.99.00' WHERE nombre ILIKE '%zapato%' OR nombre ILIKE '%tenis%' OR nombre ILIKE '%sandalia%';
UPDATE categorias SET hs_code = '4202.92.00' WHERE nombre ILIKE '%bolsa%' OR nombre ILIKE '%mochila%' OR nombre ILIKE '%cartera%';

-- Si no se asignó ningún código específico, usar código genérico para ropa
UPDATE categorias SET hs_code = '6109.90.00' WHERE hs_code IS NULL;

-- Crear índice para mejorar performance de consultas por hs_code
CREATE INDEX idx_categorias_hs_code ON categorias(hs_code);

-- Verificar los resultados
SELECT id_categoria, nombre, hs_code 
FROM categorias 
ORDER BY id_categoria;
