-- Verificar si las columnas SkyDropX existen en la tabla categorias
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'categorias' 
  AND column_name IN ('alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion')
ORDER BY column_name;

-- Si no existen, las vamos a crear
DO $$
BEGIN
  -- Verificar y agregar columna alto_cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'alto_cm'
  ) THEN
    ALTER TABLE categorias ADD COLUMN alto_cm DECIMAL(10,2) DEFAULT 0.00;
    RAISE NOTICE 'Columna alto_cm agregada';
  ELSE
    RAISE NOTICE 'Columna alto_cm ya existe';
  END IF;

  -- Verificar y agregar columna largo_cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'largo_cm'
  ) THEN
    ALTER TABLE categorias ADD COLUMN largo_cm DECIMAL(10,2) DEFAULT 0.00;
    RAISE NOTICE 'Columna largo_cm agregada';
  ELSE
    RAISE NOTICE 'Columna largo_cm ya existe';
  END IF;

  -- Verificar y agregar columna ancho_cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'ancho_cm'
  ) THEN
    ALTER TABLE categorias ADD COLUMN ancho_cm DECIMAL(10,2) DEFAULT 0.00;
    RAISE NOTICE 'Columna ancho_cm agregada';
  ELSE
    RAISE NOTICE 'Columna ancho_cm ya existe';
  END IF;

  -- Verificar y agregar columna peso_kg
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'peso_kg'
  ) THEN
    ALTER TABLE categorias ADD COLUMN peso_kg DECIMAL(10,3) DEFAULT 0.000;
    RAISE NOTICE 'Columna peso_kg agregada';
  ELSE
    RAISE NOTICE 'Columna peso_kg ya existe';
  END IF;

  -- Verificar y agregar columna nivel_compresion
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categorias' AND column_name = 'nivel_compresion'
  ) THEN
    ALTER TABLE categorias ADD COLUMN nivel_compresion VARCHAR(20) DEFAULT 'baja' CHECK (nivel_compresion IN ('baja', 'media', 'alta'));
    RAISE NOTICE 'Columna nivel_compresion agregada';
  ELSE
    RAISE NOTICE 'Columna nivel_compresion ya existe';
  END IF;
END $$;
