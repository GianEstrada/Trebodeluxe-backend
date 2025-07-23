const db = require('../config/db');

class ProductModel {
  // Obtener productos para admin con variantes e información completa
  static async getProductsForAdmin(filters = {}) {
    try {
      const {
        search = '',
        categoria = '',
        marca = '',
        activo = null,
        limit = 20,
        offset = 0,
        sortBy = 'fecha_creacion',
        sortOrder = 'DESC'
      } = filters;

      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereConditions.push(`(p.nombre ILIKE $${paramCount} OR p.descripcion ILIKE $${paramCount})`);
        queryParams.push(`%${search}%`);
      }

      if (categoria) {
        paramCount++;
        whereConditions.push(`p.categoria = $${paramCount}`);
        queryParams.push(categoria);
      }

      if (marca) {
        paramCount++;
        whereConditions.push(`p.marca = $${paramCount}`);
        queryParams.push(marca);
      }

      if (activo !== null) {
        paramCount++;
        whereConditions.push(`p.activo = $${paramCount}`);
        queryParams.push(activo);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const query = `
        SELECT 
          p.*,
          st.nombre as sistema_talla_nombre,
          CASE 
            WHEN COUNT(v.id_variante) > 0 THEN 
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
                  'tallas_stock', COALESCE(stock_info.tallas_stock, '[]'::json)
                ) ORDER BY v.id_variante
              )
            ELSE '[]'::json
          END as variantes,
          CASE 
            WHEN COUNT(v.id_variante) = 0 THEN false
            ELSE bool_and(COALESCE(stock_info.stock_total, 0) > 0)
          END as tiene_stock
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
                'cantidad', s.cantidad
              ) ORDER BY t.orden
            ) as tallas_stock
          FROM stock s
          JOIN tallas t ON s.id_talla = t.id_talla
          WHERE s.cantidad > 0
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        ${whereClause}
        GROUP BY p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca, 
                 p.id_sistema_talla, p.activo, p.fecha_creacion, st.nombre
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      const countQuery = `
        SELECT COUNT(DISTINCT p.id_producto) as total
        FROM productos p
        ${whereClause}
      `;

      const [result, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, queryParams.slice(0, -2))
      ]);

      return {
        products: result.rows,
        total: parseInt(countResult.rows[0].total),
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
        hasNext: offset + limit < parseInt(countResult.rows[0].total),
        hasPrev: offset > 0
      };

    } catch (error) {
      console.error('Error en getProductsForAdmin:', error);
      throw error;
    }
  }

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
              )
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
              json_build_object(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'orden', t.orden,
                'cantidad', s.cantidad
              )
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
              'imagenes', COALESCE(img.imagenes, '[]'::json),
              'stock_total', COALESCE(stock.total_stock, 0),
              'disponible', COALESCE(stock.total_stock, 0) > 0
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes,
          COALESCE(MAX(stock.total_stock), 0) as stock_total_producto,
          COALESCE(MAX(stock.total_stock), 0) > 0 as producto_disponible
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
        LEFT JOIN (
          SELECT 
            id_variante,
            SUM(cantidad) as total_stock
          FROM stock
          GROUP BY id_variante
        ) stock ON v.id_variante = stock.id_variante
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
                'imagenes', COALESCE(img.imagenes, '[]'::json),
                'stock_total', COALESCE(stock.total_stock, 0),
                'disponible', COALESCE(stock.total_stock, 0) > 0
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
          LEFT JOIN (
            SELECT 
              id_variante,
              SUM(cantidad) as total_stock
            FROM stock
            GROUP BY id_variante
          ) stock ON v.id_variante = stock.id_variante
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

  // Obtener todos los productos con detalles para administradores
  static async getAllForAdmin() {
    try {
      const query = `
        SELECT 
          p.id_producto, 
          p.nombre, 
          p.descripcion, 
          p.categoria, 
          p.marca, 
          p.activo, 
          p.fecha_creacion, 
          st.nombre as sistema_talla
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        ORDER BY p.fecha_creacion DESC
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllForAdmin:', error);
      throw error;
    }
  }

  // Obtener productos para catálogo con imagen principal
  static async getCatalog(limit = 20, offset = 0, categoria = null, sortBy = 'fecha_creacion', sortOrder = 'DESC') {
    try {
      let whereClause = 'WHERE p.activo = true';
      let params = [limit, offset];
      let paramIndex = 3;

      if (categoria) {
        whereClause += ` AND p.categoria = $${paramIndex}`;
        params.push(categoria);
        paramIndex++;
      }

      // Validar sortBy para evitar inyección SQL
      const validSortFields = ['fecha_creacion', 'nombre', 'precio_min', 'categoria'];
      const validSortOrder = ['ASC', 'DESC'];
      
      if (!validSortFields.includes(sortBy)) sortBy = 'fecha_creacion';
      if (!validSortOrder.includes(sortOrder.toUpperCase())) sortOrder = 'DESC';

      const query = `
        SELECT DISTINCT ON (p.id_producto)
          p.id_producto,
          p.nombre,
          p.descripcion,
          p.categoria,
          p.marca,
          p.fecha_creacion,
          v.precio as precio_min,
          v.precio_original,
          CASE 
            WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
            THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
            ELSE NULL
          END as descuento_porcentaje,
          iv.url as imagen_principal,
          iv.public_id as imagen_public_id,
          COALESCE(stock_total.total, 0) as stock_disponible
        FROM productos p
        JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        LEFT JOIN (
          SELECT 
            s.id_producto,
            SUM(s.cantidad) as total
          FROM stock s
          GROUP BY s.id_producto
        ) stock_total ON p.id_producto = stock_total.id_producto
        ${whereClause}
        ORDER BY p.id_producto, v.precio ASC
        LIMIT $1 OFFSET $2
      `;

      console.log('Query catálogo:', query);
      console.log('Parámetros:', params);

      const result = await db.query(query, params);
      
      // Obtener total de productos para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT p.id_producto) as total
        FROM productos p
        JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        ${categoria ? 'WHERE p.activo = true AND p.categoria = $1' : 'WHERE p.activo = true'}
      `;

      const countParams = categoria ? [categoria] : [];
      const countResult = await db.query(countQuery, countParams);
      
      return {
        products: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
      };

    } catch (error) {
      console.error('Error en getCatalog:', error);
      throw error;
    }
  }

  // Obtener productos destacados para página principal
  static async getFeatured(limit = 12) {
    try {
      const query = `
        SELECT DISTINCT ON (p.id_producto)
          p.id_producto,
          p.nombre,
          p.descripcion,
          p.categoria,
          p.marca,
          v.precio as precio_min,
          v.precio_original,
          CASE 
            WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
            THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
            ELSE NULL
          END as descuento_porcentaje,
          iv.url as imagen_principal,
          iv.public_id as imagen_public_id,
          COALESCE(stock_total.total, 0) as stock_disponible
        FROM productos p
        JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        LEFT JOIN (
          SELECT 
            s.id_producto,
            SUM(s.cantidad) as total
          FROM stock s
          GROUP BY s.id_producto
        ) stock_total ON p.id_producto = stock_total.id_producto
        WHERE p.activo = true AND COALESCE(stock_total.total, 0) > 0
        ORDER BY p.id_producto, v.precio ASC, p.fecha_creacion DESC
        LIMIT $1
      `;

      const result = await db.query(query, [limit]);
      return result.rows;

    } catch (error) {
      console.error('Error en getFeatured:', error);
      throw error;
    }
  }

  // Obtener productos por categoría
  static async getByCategory(categoria, limit = 20, offset = 0) {
    try {
      return await this.getCatalog(limit, offset, categoria);
    } catch (error) {
      console.error('Error en getByCategory:', error);
      throw error;
    }
  }

  // Obtener categorías disponibles
  static async getCategories() {
    try {
      const query = `
        SELECT 
          p.categoria,
          COUNT(DISTINCT p.id_producto) as total_productos,
          COUNT(DISTINCT v.id_variante) FILTER (WHERE v.activo = true) as variantes_activas
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        WHERE p.activo = true AND p.categoria IS NOT NULL
        GROUP BY p.categoria
        HAVING COUNT(DISTINCT p.id_producto) > 0
        ORDER BY p.categoria ASC
      `;

      const result = await db.query(query);
      return result.rows;

    } catch (error) {
      console.error('Error en getCategories:', error);
      throw error;
    }
  }

  // Obtener productos para admin con búsqueda y filtros
  static async getProductsForAdmin(filters) {
    try {
      const {
        search = '',
        categoria = '',
        marca = '',
        activo = null,
        limit = 20,
        offset = 0,
        sortBy = 'fecha_creacion',
        sortOrder = 'DESC'
      } = filters;

      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // Filtros de búsqueda
      if (search) {
        whereConditions.push(`(
          LOWER(p.nombre) LIKE LOWER($${paramIndex}) OR 
          LOWER(p.descripcion) LIKE LOWER($${paramIndex}) OR 
          LOWER(p.marca) LIKE LOWER($${paramIndex})
        )`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (categoria) {
        whereConditions.push(`p.categoria = $${paramIndex}`);
        params.push(categoria);
        paramIndex++;
      }

      if (marca) {
        whereConditions.push(`p.marca = $${paramIndex}`);
        params.push(marca);
        paramIndex++;
      }

      if (activo !== null) {
        whereConditions.push(`p.activo = $${paramIndex}`);
        params.push(activo);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validar sortBy para evitar inyección SQL
      const validSortFields = ['nombre', 'categoria', 'marca', 'fecha_creacion', 'activo'];
      const validSortOrder = ['ASC', 'DESC'];
      
      if (!validSortFields.includes(sortBy)) sortBy = 'fecha_creacion';
      if (!validSortOrder.includes(sortOrder.toUpperCase())) sortOrder = 'DESC';

      const query = `
        SELECT 
          p.id_producto,
          p.nombre,
          p.descripcion,
          p.categoria,
          p.marca,
          p.activo,
          p.fecha_creacion,
          st.nombre as sistema_talla,
          COUNT(DISTINCT v.id_variante) as total_variantes,
          COUNT(DISTINCT v.id_variante) FILTER (WHERE v.activo = true) as variantes_activas,
          COALESCE(SUM(stock_info.stock_total), 0) as stock_total,
          MIN(v.precio) as precio_minimo,
          MAX(v.precio) as precio_maximo,
          iv.url as imagen_principal,
          iv.public_id as imagen_public_id
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        LEFT JOIN (
          SELECT 
            id_variante,
            SUM(cantidad) as stock_total
          FROM stock
          GROUP BY id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        ${whereClause}
        GROUP BY p.id_producto, st.nombre, iv.url, iv.public_id
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);

      // Query para contar total de resultados
      const countQuery = `
        SELECT COUNT(DISTINCT p.id_producto) as total
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        ${whereClause}
      `;

      const countParams = params.slice(0, -2); // Remover limit y offset

      const [productsResult, countResult] = await Promise.all([
        db.query(query, params),
        db.query(countQuery, countParams)
      ]);

      return {
        products: productsResult.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        hasMore: offset + limit < parseInt(countResult.rows[0].total)
      };

    } catch (error) {
      console.error('Error en getProductsForAdmin:', error);
      throw error;
    }
  }

  // Obtener marcas disponibles
  static async getBrands() {
    try {
      const query = `
        SELECT 
          p.marca,
          COUNT(DISTINCT p.id_producto) as total_productos
        FROM productos p
        WHERE p.activo = true AND p.marca IS NOT NULL
        GROUP BY p.marca
        HAVING COUNT(DISTINCT p.id_producto) > 0
        ORDER BY p.marca ASC
      `;

      const result = await db.query(query);
      return result.rows;

    } catch (error) {
      console.error('Error en getBrands:', error);
      throw error;
    }
  }

  // Crear producto con variante inicial
  static async createWithVariant(data) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      const { producto, variante } = data;

      // Crear producto
      const productQuery = `
        INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla, activo)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `;

      const productResult = await client.query(productQuery, [
        producto.nombre,
        producto.descripcion,
        producto.categoria,
        producto.marca,
        producto.id_sistema_talla
      ]);

      const newProduct = productResult.rows[0];

      // Crear variante inicial
      const variantQuery = `
        INSERT INTO variantes (id_producto, nombre, precio, precio_original, activo)
        VALUES ($1, $2, $3, $4, true)
        RETURNING *
      `;

      const variantResult = await client.query(variantQuery, [
        newProduct.id_producto,
        variante.nombre,
        variante.precio,
        variante.precio_original
      ]);

      const newVariant = variantResult.rows[0];

      await client.query('COMMIT');

      return {
        ...newProduct,
        variante_inicial: newVariant
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en createWithVariant:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Actualizar producto
  static async updateProduct(id, updateData) {
    try {
      const {
        nombre,
        descripcion,
        categoria,
        marca,
        id_sistema_talla,
        activo
      } = updateData;

      const query = `
        UPDATE productos 
        SET 
          nombre = COALESCE($2, nombre),
          descripcion = COALESCE($3, descripcion),
          categoria = COALESCE($4, categoria),
          marca = COALESCE($5, marca),
          id_sistema_talla = COALESCE($6, id_sistema_talla),
          activo = COALESCE($7, activo)
        WHERE id_producto = $1
        RETURNING *
      `;

      const result = await db.query(query, [
        id,
        nombre,
        descripcion,
        categoria,
        marca,
        id_sistema_talla,
        activo
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error en updateProduct:', error);
      throw error;
    }
  }

  // Eliminar producto
  static async deleteProduct(id) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Primero eliminar imágenes de las variantes
      const imagesQuery = `
        SELECT iv.public_id 
        FROM imagenes_variante iv
        JOIN variantes v ON iv.id_variante = v.id_variante
        WHERE v.id_producto = $1
      `;
      const imagesResult = await client.query(imagesQuery, [id]);

      // Eliminar producto (esto eliminará en cascada variantes, stock, imágenes)
      const deleteQuery = `
        DELETE FROM productos 
        WHERE id_producto = $1 
        RETURNING *
      `;

      const result = await client.query(deleteQuery, [id]);

      await client.query('COMMIT');

      // Retornar también las imágenes que se deben eliminar de Cloudinary
      return {
        deletedProduct: result.rows[0],
        imagesToDelete: imagesResult.rows.map(row => row.public_id)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en deleteProduct:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =================== MÉTODOS PARA VARIANTES ===================

  // Crear variante
  static async createVariant(variantData) {
    try {
      const query = `
        INSERT INTO variantes (producto_id, nombre, descripcion, precio, activo, fecha_creacion)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await db.query(query, [
        variantData.producto_id,
        variantData.nombre,
        variantData.descripcion,
        variantData.precio,
        variantData.activo
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error en createVariant:', error);
      throw error;
    }
  }

  // Obtener variante por ID con información completa
  static async getVariantById(id) {
    try {
      const query = `
        SELECT 
          v.*,
          p.nombre as producto_nombre,
          p.categoria,
          p.marca,
          COALESCE(img.imagenes, '[]'::json) as imagenes,
          COALESCE(stock_info.tallas, '[]'::json) as tallas,
          COALESCE(stock_info.stock_total, 0) as stock_total
        FROM variantes v
        JOIN productos p ON v.producto_id = p.id_producto
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
                'talla_id', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'cantidad', s.cantidad
              ) ORDER BY t.orden
            ) as tallas
          FROM stock s
          JOIN tallas t ON s.id_talla = t.id_talla
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        WHERE v.id_variante = $1
      `;

      const result = await db.query(query, [id]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('Error en getVariantById:', error);
      throw error;
    }
  }

  // Actualizar variante
  static async updateVariant(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCounter = 1;

      // Construir dinámicamente la consulta UPDATE
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCounter}`);
          values.push(value);
          paramCounter++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      values.push(id); // Para el WHERE

      const query = `
        UPDATE variantes 
        SET ${fields.join(', ')}
        WHERE id_variante = $${paramCounter}
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0];

    } catch (error) {
      console.error('Error en updateVariant:', error);
      throw error;
    }
  }

  // Eliminar variante
  static async deleteVariant(id) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Obtener información de la variante antes de eliminarla
      const variantInfo = await client.query(`
        SELECT v.*, iv.public_id 
        FROM variantes v
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
        WHERE v.id_variante = $1
      `, [id]);

      if (variantInfo.rows.length === 0) {
        await client.query('ROLLBACK');
        return { deletedVariant: null };
      }

      // Eliminar variante (esto eliminará en cascada stock e imágenes)
      const deleteQuery = `
        DELETE FROM variantes 
        WHERE id_variante = $1 
        RETURNING *
      `;

      const result = await client.query(deleteQuery, [id]);

      await client.query('COMMIT');

      // Retornar información de la variante eliminada y las imágenes a eliminar
      const imagesToDelete = variantInfo.rows
        .filter(row => row.public_id)
        .map(row => row.public_id);

      return {
        deletedVariant: result.rows[0],
        imagesToDelete
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en deleteVariant:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // =================== MÉTODOS PARA STOCK ===================

  // Crear o actualizar stock
  static async createOrUpdateStock(stockData) {
    try {
      const query = `
        INSERT INTO stock (variante_id, talla_id, cantidad)
        VALUES ($1, $2, $3)
        ON CONFLICT (variante_id, talla_id) 
        DO UPDATE SET 
          cantidad = EXCLUDED.cantidad,
          fecha_actualizacion = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await db.query(query, [
        stockData.variante_id,
        stockData.talla_id,
        stockData.cantidad
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error en createOrUpdateStock:', error);
      throw error;
    }
  }

  // Eliminar todo el stock de una variante
  static async deleteVariantStock(varianteId) {
    try {
      const query = `DELETE FROM stock WHERE variante_id = $1`;
      const result = await db.query(query, [varianteId]);
      return result.rowCount;
    } catch (error) {
      console.error('Error en deleteVariantStock:', error);
      throw error;
    }
  }

  // Obtener un producto básico por ID (para validaciones)
  static async getProductById(id) {
    try {
      const query = `SELECT * FROM productos WHERE id_producto = $1`;
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error en getProductById:', error);
      throw error;
    }
  }
}

module.exports = ProductModel;
