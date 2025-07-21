const db = require('../config/db');

class ProductModel {
  // Obtener todos los productos con variantes completas
  static async getAll() {
    try {
      const query = `
        SELECT 
          p.*,
          st.nombre as sistema_talla_nombre,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', v.precio,
              'precio_original', v.precio_original,
              'descuento_porcentaje', 
              CASE 
                WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                ELSE NULL
              END,
              'activo', v.activo,
              'imagenes', COALESCE(img.imagenes, '[]'::json),
              'stock_disponible', COALESCE(stock_info.stock_total, 0),
              'tallas_disponibles', COALESCE(stock_info.tallas, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        LEFT JOIN (
          SELECT 
            s.id_variante,
            SUM(s.cantidad) as stock_total,
            json_agg(
              json_build_object(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'orden', t.orden,
                'cantidad', s.cantidad
              ) ORDER BY t.orden
            ) FILTER (WHERE s.cantidad > 0) as tallas
          FROM stock s
          INNER JOIN tallas t ON s.id_talla = t.id_talla
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        WHERE p.activo = true
        GROUP BY p.id_producto, st.nombre
        ORDER BY p.fecha_creacion DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAll productos:', error);
      throw error;
    }
  }

  // Obtener todos los productos para administradores (incluye inactivos)
  static async getAllForAdmin() {
    try {
      const query = `
        SELECT 
          p.*,
          st.nombre as sistema_talla_nombre,
          COUNT(v.id_variante) as total_variantes,
          COUNT(CASE WHEN v.activo = true THEN 1 END) as variantes_activas,
          COALESCE(SUM(stock_total.stock), 0) as stock_total_producto
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        LEFT JOIN (
          SELECT 
            s.id_variante,
            SUM(s.cantidad) as stock
          FROM stock s
          GROUP BY s.id_variante
        ) stock_total ON v.id_variante = stock_total.id_variante
        GROUP BY p.id_producto, st.nombre
        ORDER BY p.fecha_creacion DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllForAdmin productos:', error);
      throw error;
    }
  }

  // Obtener un producto por ID con toda su información
  static async getById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          st.nombre as sistema_talla_nombre,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', v.precio,
              'precio_original', v.precio_original,
              'descuento_porcentaje', 
              CASE 
                WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                ELSE NULL
              END,
              'activo', v.activo,
              'imagenes', COALESCE(img.imagenes, '[]'::json),
              'stock_disponible', COALESCE(stock_info.stock_total, 0),
              'tallas_disponibles', COALESCE(stock_info.tallas, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        LEFT JOIN (
          SELECT 
            s.id_variante,
            SUM(s.cantidad) as stock_total,
            json_agg(
              DISTINCT json_build_object(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'orden', t.orden,
                'cantidad', s.cantidad
              ) ORDER BY json_build_object(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'orden', t.orden,
                'cantidad', s.cantidad
              )->>'orden'
            ) FILTER (WHERE s.cantidad > 0) as tallas
          FROM stock s
          INNER JOIN tallas t ON s.id_talla = t.id_talla
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        WHERE p.id_producto = $1 AND p.activo = true
        GROUP BY p.id_producto, st.nombre
      `;
      
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error en getById producto:', error);
      throw error;
    }
  }

  // Obtener productos recientes
  static async getRecent(limit = 6) {
    try {
      const query = `
        SELECT 
          p.*,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', v.precio,
              'precio_original', v.precio_original,
              'descuento_porcentaje', 
              CASE 
                WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                ELSE NULL
              END,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        WHERE p.activo = true
        GROUP BY p.id_producto
        ORDER BY p.fecha_creacion DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error en getRecent productos:', error);
      throw error;
    }
  }

  // Obtener productos recientes por categoría
  static async getRecentByCategory(limit = 4) {
    try {
      const query = `
        SELECT 
          categoria,
          json_agg(
            json_build_object(
              'id_producto', p.id_producto,
              'nombre', p.nombre,
              'descripcion', p.descripcion,
              'marca', p.marca,
              'categoria', p.categoria,
              'fecha_creacion', p.fecha_creacion,
              'variantes', productos_variantes.variantes
            ) ORDER BY p.fecha_creacion DESC
          ) as productos
        FROM productos p
        INNER JOIN (
          SELECT 
            p.id_producto,
            json_agg(
              json_build_object(
                'id_variante', v.id_variante,
                'nombre', v.nombre,
                'precio', v.precio,
                'precio_original', v.precio_original,
                'descuento_porcentaje', 
                CASE 
                  WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                  THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                  ELSE NULL
                END,
                'imagenes', COALESCE(img.imagenes, '[]'::json)
              ) ORDER BY v.id_variante
            ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
          FROM productos p
          LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
          LEFT JOIN (
            SELECT 
              id_variante,
              json_agg(
                json_build_object(
                  'id_imagen', id_imagen,
                  'url', url,
                  'public_id', public_id,
                  'orden', orden
                ) ORDER BY orden
              ) as imagenes
            FROM imagenes_variante
            GROUP BY id_variante
          ) img ON v.id_variante = img.id_variante
          WHERE p.activo = true
          GROUP BY p.id_producto
        ) productos_variantes ON p.id_producto = productos_variantes.id_producto
        WHERE p.activo = true 
          AND p.categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY categoria
      `;
      
      const result = await db.query(query);
      
      // Limitar productos por categoría
      const limitedResult = result.rows.map(category => ({
        ...category,
        productos: category.productos.slice(0, limit)
      }));
      
      return limitedResult;
    } catch (error) {
      console.error('Error en getRecentByCategory productos:', error);
      throw error;
    }
  }

  // Obtener productos con mejores promociones
  static async getBestPromotions(limit = 6) {
    try {
      const query = `
        SELECT 
          p.*,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', v.precio,
              'precio_original', v.precio_original,
              'descuento_porcentaje', 
              CASE 
                WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                ELSE NULL
              END,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        WHERE p.activo = true
          AND EXISTS (
            SELECT 1 FROM variantes v2 
            WHERE v2.id_producto = p.id_producto 
              AND v2.precio_original IS NOT NULL 
              AND v2.precio_original > v2.precio
              AND v2.activo = true
          )
        GROUP BY p.id_producto
        ORDER BY (
          SELECT MAX(
            CASE 
              WHEN v3.precio_original IS NOT NULL AND v3.precio_original > v3.precio 
              THEN ROUND(((v3.precio_original - v3.precio) / v3.precio_original * 100)::numeric, 2)
              ELSE 0
            END
          )
          FROM variantes v3 
          WHERE v3.id_producto = p.id_producto AND v3.activo = true
        ) DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error en getBestPromotions productos:', error);
      throw error;
    }
  }

  // Crear un nuevo producto
  static async create(productData) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Insertar el producto
      const productQuery = `
        INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const productResult = await client.query(productQuery, [
        productData.nombre,
        productData.descripcion || null,
        productData.categoria || null,
        productData.marca || null,
        productData.id_sistema_talla || null,
        productData.activo !== false
      ]);
      
      const productId = productResult.rows[0].id_producto;
      
      // Insertar variantes si se proporcionan
      if (productData.variantes && productData.variantes.length > 0) {
        for (const variant of productData.variantes) {
          const variantQuery = `
            INSERT INTO variantes (id_producto, nombre, precio, precio_original, activo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          
          const variantResult = await client.query(variantQuery, [
            productId,
            variant.nombre || null,
            variant.precio,
            variant.precio_original || null,
            variant.activo !== false
          ]);
          
          const variantId = variantResult.rows[0].id_variante;
          
          // Insertar imágenes de la variante si se proporcionan
          if (variant.imagenes && variant.imagenes.length > 0) {
            for (let i = 0; i < variant.imagenes.length; i++) {
              const imagen = variant.imagenes[i];
              await client.query(
                'INSERT INTO imagenes_variante (id_variante, url, public_id, orden) VALUES ($1, $2, $3, $4)',
                [variantId, imagen.url, imagen.public_id, i + 1]
              );
            }
          }
        }
      }
      
      await client.query('COMMIT');
      return productResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en create producto:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Actualizar un producto
  static async update(id, productData) {
    try {
      const query = `
        UPDATE productos 
        SET nombre = $1, descripcion = $2, categoria = $3, marca = $4, 
            id_sistema_talla = $5, activo = $6
        WHERE id_producto = $7
        RETURNING *
      `;
      
      const result = await db.query(query, [
        productData.nombre,
        productData.descripcion || null,
        productData.categoria || null,
        productData.marca || null,
        productData.id_sistema_talla || null,
        productData.activo !== false,
        id
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Producto no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en update producto:', error);
      throw error;
    }
  }

  // Eliminar un producto (marcarlo como inactivo)
  static async delete(id) {
    try {
      const query = 'UPDATE productos SET activo = false WHERE id_producto = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Producto no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en delete producto:', error);
      throw error;
    }
  }

  // Obtener productos por categoría
  static async getByCategory(categoria, limit, offset) {
    try {
      const query = `
        SELECT 
          p.*,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', v.precio,
              'precio_original', v.precio_original,
              'descuento_porcentaje', 
              CASE 
                WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                ELSE NULL
              END,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        WHERE p.activo = true AND p.categoria = $1
        GROUP BY p.id_producto
        ORDER BY p.fecha_creacion DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await db.query(query, [categoria, limit || 20, offset || 0]);
      return result.rows;
    } catch (error) {
      console.error('Error en getByCategory productos:', error);
      throw error;
    }
  }

  // Obtener todas las categorías disponibles
  static async getCategories() {
    try {
      const query = `
        SELECT DISTINCT categoria, COUNT(*) as total_productos
        FROM productos 
        WHERE activo = true AND categoria IS NOT NULL
        GROUP BY categoria
        ORDER BY categoria
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getCategories:', error);
      throw error;
    }
  }

  // Obtener todas las marcas disponibles
  static async getBrands() {
    try {
      const query = `
        SELECT DISTINCT marca, COUNT(*) as total_productos
        FROM productos 
        WHERE activo = true AND marca IS NOT NULL
        GROUP BY marca
        ORDER BY marca
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getBrands:', error);
      throw error;
    }
  }

  // Buscar productos
  static async search(searchTerm, limit, offset) {
    try {
      const query = `
        SELECT 
          p.*,
          json_agg(
            json_build_object(
              'id_variante', v.id_variante,
              'nombre', v.nombre,
              'precio', v.precio,
              'precio_original', v.precio_original,
              'descuento_porcentaje', 
              CASE 
                WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
                THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
                ELSE NULL
              END,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              ) ORDER BY orden
            ) as imagenes
          FROM imagenes_variante
          GROUP BY id_variante
        ) img ON v.id_variante = img.id_variante
        WHERE p.activo = true 
          AND (
            p.nombre ILIKE $1 OR 
            p.descripcion ILIKE $1 OR 
            p.categoria ILIKE $1 OR 
            p.marca ILIKE $1
          )
        GROUP BY p.id_producto
        ORDER BY p.fecha_creacion DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await db.query(query, [`%${searchTerm}%`, limit || 20, offset || 0]);
      return result.rows;
    } catch (error) {
      console.error('Error en search productos:', error);
      throw error;
    }
  }
}

module.exports = ProductModel;
