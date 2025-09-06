-- Script para crear datos de prueba para el sistema de cotizaciones de envío

-- Crear un carrito de prueba si no existe
INSERT INTO carritos (id_carrito, id_usuario, fecha_creacion, fecha_actualizacion)
VALUES (1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id_carrito) DO NOTHING;

-- Verificar que existan productos, categorías, variantes y tallas para la prueba
-- Si no existen, crear algunos básicos

-- Insertar categoría de prueba si no existe
INSERT INTO categorias (id_categoria, nombre, alto_cm, largo_cm, ancho_cm, peso_gramos, compresion)
VALUES (1, 'Camisetas', 2.0, 30.0, 25.0, 200, 0.6)
ON CONFLICT (id_categoria) DO UPDATE SET
  alto_cm = EXCLUDED.alto_cm,
  largo_cm = EXCLUDED.largo_cm,
  ancho_cm = EXCLUDED.ancho_cm,
  peso_gramos = EXCLUDED.peso_gramos,
  compresion = EXCLUDED.compresion;

-- Insertar producto de prueba si no existe
INSERT INTO productos (id_producto, nombre, precio, id_categoria, peso_producto)
VALUES (1, 'Camiseta Básica', 299.99, 1, 200)
ON CONFLICT (id_producto) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  precio = EXCLUDED.precio,
  id_categoria = EXCLUDED.id_categoria,
  peso_producto = EXCLUDED.peso_producto;

-- Insertar variante de prueba si no existe
INSERT INTO variantes (id_variante, id_producto, nombre, precio_variante)
VALUES (1, 1, 'Negro', 0.00)
ON CONFLICT (id_variante) DO UPDATE SET
  precio_variante = EXCLUDED.precio_variante;

-- Insertar talla de prueba si no existe
INSERT INTO tallas (id_talla, nombre)
VALUES (1, 'M')
ON CONFLICT (id_talla) DO NOTHING;

-- Insertar contenido en el carrito de prueba
INSERT INTO contenido_carrito (id_carrito, id_producto, id_variante, id_talla, cantidad)
VALUES (1, 1, 1, 1, 2)
ON CONFLICT (id_carrito, id_producto, id_variante, id_talla) 
DO UPDATE SET cantidad = EXCLUDED.cantidad;

-- Verificar los datos insertados
SELECT 
  cc.id_contenido,
  cc.cantidad,
  p.nombre as producto_nombre,
  p.precio,
  c.nombre as categoria_nombre,
  c.alto_cm,
  c.largo_cm,
  c.ancho_cm,
  c.peso_gramos,
  c.compresion,
  v.nombre as variante_nombre,
  t.nombre as talla_nombre
FROM contenido_carrito cc
INNER JOIN productos p ON cc.id_producto = p.id_producto
INNER JOIN categorias c ON p.id_categoria = c.id_categoria
INNER JOIN variantes v ON cc.id_variante = v.id_variante
INNER JOIN tallas t ON cc.id_talla = t.id_talla
WHERE cc.id_carrito = 1;
