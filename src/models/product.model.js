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
        whereConditions.push(`p.id_categoria = $${paramCount}`);
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
          c.nombre_categoria as categoria_nombre,
          CASE 
            WHEN COUNT(v.id_variante) > 0 THEN 
              json_agg(
                json_build_object(
                  'id_variante', v.id_variante,
                  'nombre', v.nombre,
                  'precio', stock_precios.precio,
                  'descuento_porcentaje', NULL,
                  'activo', v.activo,
                  'imagenes', COALESCE(img.imagenes, '[]'::json),
                  'stock_disponible', COALESCE(stock_info.stock_total, 0),
                  'tallas_stock', COALESCE(stock_info.tallas_stock, '[]'::json),
                  'precio_minimo', precios_info.precio_minimo,
                  'precio_maximo', precios_info.precio_maximo,
                  'precios_distintos', precios_info.precios_distintos,
                  'precio_unico', precios_info.precio_unico
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
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
                'cantidad', s.cantidad,
                'precio', s.precio
              ) ORDER BY t.orden
            ) as tallas_stock
          FROM stock s
          JOIN tallas t ON s.id_talla = t.id_talla
          WHERE s.cantidad > 0
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        LEFT JOIN (
          SELECT 
            s.id_variante,
            MIN(s.precio) as precio_minimo,
            MAX(s.precio) as precio_maximo,
            COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
            CASE 
              WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
              ELSE false
            END as precio_unico
          FROM stock s
          GROUP BY s.id_variante
        ) precios_info ON v.id_variante = precios_info.id_variante
        ${whereClause}
        GROUP BY p.id_producto, p.nombre, p.descripcion, p.id_categoria, p.marca, 
                 p.id_sistema_talla, p.activo, p.fecha_creacion, st.nombre, 
                 c.nombre_categoria
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
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
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
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
                'cantidad', s.cantidad,
                'precio', s.precio
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
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
              'activo', v.activo,
              'disponible', (v.activo AND COALESCE(stock_info.stock_total, 0) > 0 AND COALESCE(stock_precios.precio, 0) > 0),
              'stock_total', COALESCE(stock_info.stock_total, 0),
              'imagenes', COALESCE(img.imagenes, '[]'::json),
              'stock_disponible', COALESCE(stock_info.stock_total, 0),
              'tallas_disponibles', COALESCE(stock_info.tallas, '[]'::json),
              'precio_minimo', precios_info.precio_minimo,
              'precio_maximo', precios_info.precio_maximo,
              'precios_distintos', precios_info.precios_distintos,
              'precio_unico', precios_info.precio_unico
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes,
          (
            SELECT json_agg(
              json_build_object(
                'id_talla', tallas_info.id_talla,
                'nombre_talla', tallas_info.nombre_talla,
                'orden', tallas_info.orden,
                'cantidad', tallas_info.total_cantidad
              ) ORDER BY tallas_info.orden, tallas_info.id_talla
            )
            FROM (
              SELECT DISTINCT 
                t.id_talla,
                t.nombre_talla,
                t.orden,
                COALESCE(stock_sum.total_cantidad, 0) as total_cantidad
              FROM tallas t
              LEFT JOIN (
                SELECT 
                  s.id_talla,
                  SUM(s.cantidad) as total_cantidad
                FROM stock s
                INNER JOIN variantes v2 ON s.id_variante = v2.id_variante
                WHERE v2.id_producto = p.id_producto AND v2.activo = true
                GROUP BY s.id_talla
              ) stock_sum ON t.id_talla = stock_sum.id_talla
              WHERE stock_sum.total_cantidad > 0
            ) tallas_info
          ) as tallas_disponibles
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
                'cantidad', s.cantidad,
                'precio', s.precio
              )
            ) FILTER (WHERE s.cantidad > 0) as tallas
          FROM stock s
          INNER JOIN tallas t ON s.id_talla = t.id_talla
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        LEFT JOIN (
          SELECT 
            s.id_variante,
            MIN(s.precio) as precio_minimo,
            MAX(s.precio) as precio_maximo,
            COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
            CASE 
              WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
              ELSE false
            END as precio_unico
          FROM stock s
          GROUP BY s.id_variante
        ) precios_info ON v.id_variante = precios_info.id_variante
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
          c.nombre as categoria_nombre,
          COALESCE(
            json_agg(
              json_build_object(
                'id_variante', v.id_variante,
                'nombre', v.nombre,
                'precio', stock_precios.precio,
                'descuento_porcentaje', NULL,
                'imagenes', COALESCE(img.imagenes, '[]'::json),
                'stock_total', COALESCE(stock.total_stock, 0),
                'disponible', COALESCE(stock.total_stock, 0) > 0
              )
            ) FILTER (WHERE v.id_variante IS NOT NULL), 
            '[]'::json
          ) as variantes
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              )
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
        GROUP BY p.id_producto, p.nombre, p.descripcion, p.id_categoria, p.marca, 
                 p.id_sistema_talla, p.activo, p.fecha_creacion, c.nombre
        ORDER BY p.fecha_creacion DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      
      // Obtener tallas disponibles para cada producto por separado
      for (let product of result.rows) {
        const tallasQuery = `
          SELECT DISTINCT t.id_talla, t.nombre_talla
          FROM variantes v
          JOIN stock s ON v.id_variante = s.id_variante
          JOIN tallas t ON s.id_talla = t.id_talla
          WHERE v.id_producto = $1 AND v.activo = true AND s.cantidad > 0
          ORDER BY t.id_talla
        `;
        
        const tallasResult = await db.query(tallasQuery, [product.id_producto]);
        product.tallas_disponibles = tallasResult.rows;
      }
      
      return result.rows;
    } catch (error) {
      console.error('Error en getRecent productos:', error);
      throw error;
    }
  }

  // Obtener productos recientes por categoría
  static async getRecentByCategory(limit = 4) {
    try {
      // Versión simplificada temporalmente para evitar errores
      const query = `
        SELECT 
          COALESCE(c.nombre, 'Sin categoría') as categoria,
          p.id_producto,
          p.nombre,
          p.descripcion,
          p.marca,
          p.fecha_creacion
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE p.activo = true 
        ORDER BY p.fecha_creacion DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit * 3]); // Obtener más productos para distribuir por categoría
      
      // Agrupar productos por categoría
      const productsByCategory = {};
      result.rows.forEach(product => {
        if (!productsByCategory[product.categoria]) {
          productsByCategory[product.categoria] = [];
        }
        if (productsByCategory[product.categoria].length < limit) {
          productsByCategory[product.categoria].push({
            id_producto: product.id_producto,
            nombre: product.nombre,
            descripcion: product.descripcion,
            marca: product.marca,
            categoria: product.categoria,
            fecha_creacion: product.fecha_creacion,
            variantes: [] // Temporalmente vacío
          });
        }
      });
      
      // Convertir a array de objetos con formato esperado
      const limitedResult = Object.keys(productsByCategory).map(categoria => ({
        categoria,
        productos: productsByCategory[categoria]
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
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
            INSERT INTO variantes (id_producto, nombre, activo)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
          
          const variantResult = await client.query(variantQuery, [
            productId,
            variant.nombre || null,
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
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
        WHERE p.activo = true AND p.id_categoria = $1
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
        SELECT DISTINCT COALESCE(c.nombre, 'Sin categoría') as categoria, COUNT(*) as total_productos
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        WHERE p.activo = true AND p.id_categoria IS NOT NULL
        GROUP BY c.nombre
        ORDER BY c.nombre
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
              'precio', stock_precios.precio,
              'descuento_porcentaje', NULL,
              'imagenes', COALESCE(img.imagenes, '[]'::json)
            ) ORDER BY v.id_variante
          ) FILTER (WHERE v.id_variante IS NOT NULL) as variantes
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
            c.nombre ILIKE $1 OR 
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
          p.id_categoria, 
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
        // Filtrar por slug de categoría en lugar de ID
        whereClause += ` AND LOWER(REPLACE(c.nombre, ' ', '-')) = $${paramIndex}`;
        params.push(categoria.toLowerCase());
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
          p.id_categoria,
          c.nombre as categoria_nombre,
          p.marca,
          p.fecha_creacion,
          stock_precios.precio as precio_min,
          NULL as precio_original,
          NULL as descuento_porcentaje,
          iv.url as imagen_principal,
          iv.public_id as imagen_public_id,
          COALESCE(stock_total.total, 0) as stock_disponible
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            s.id_variante,
            MIN(s.precio) as precio
          FROM stock s
          WHERE s.precio IS NOT NULL
          GROUP BY s.id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        LEFT JOIN (
          SELECT 
            s.id_variante,
            SUM(s.cantidad) as total
          FROM stock s
          GROUP BY s.id_variante
        ) stock_total ON v.id_variante = stock_total.id_variante
        ${whereClause}
        ORDER BY p.id_producto, stock_precios.precio ASC
        LIMIT $1 OFFSET $2
      `;

      console.log('Query catálogo:', query);
      console.log('Parámetros:', params);

      const result = await db.query(query, params);
      
      // Obtener total de productos para paginación
      const countQuery = `
        SELECT COUNT(DISTINCT p.id_producto) as total
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        ${categoria ? 'WHERE p.activo = true AND LOWER(REPLACE(c.nombre, \' \', \'-\')) = $1' : 'WHERE p.activo = true'}
      `;

      const countParams = categoria ? [categoria.toLowerCase()] : [];
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

  // Obtener productos destacados para página principal CON variantes completas
  // Usar la misma estructura que getRecent que sabemos que funciona
  static async getFeatured(limit = 12) {
    try {
      const query = `
        SELECT 
          p.*,
          c.nombre as categoria_nombre,
          COALESCE(
            json_agg(
              json_build_object(
                'id_variante', v.id_variante,
                'nombre', v.nombre,
                'precio', stock_precios.precio,
                'descuento_porcentaje', NULL,
                'imagenes', COALESCE(img.imagenes, '[]'::json),
                'stock_total', COALESCE(stock.total_stock, 0),
                'disponible', COALESCE(stock.total_stock, 0) > 0
              )
            ) FILTER (WHERE v.id_variante IS NOT NULL), 
            '[]'::json
          ) as variantes
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
        LEFT JOIN (
          SELECT 
            id_variante,
            json_agg(
              json_build_object(
                'id_imagen', id_imagen,
                'url', url,
                'public_id', public_id,
                'orden', orden
              )
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
        GROUP BY p.id_producto, p.nombre, p.descripcion, p.id_categoria, p.marca, 
                 p.id_sistema_talla, p.activo, p.fecha_creacion, c.nombre
        ORDER BY p.fecha_creacion DESC
        LIMIT $1
      `;
      
      const result = await db.query(query, [limit]);
      
      // Obtener tallas disponibles para cada producto por separado
      for (let product of result.rows) {
        const tallasQuery = `
          SELECT DISTINCT t.id_talla, t.nombre_talla
          FROM variantes v
          JOIN stock s ON v.id_variante = s.id_variante
          JOIN tallas t ON s.id_talla = t.id_talla
          WHERE v.id_producto = $1 AND v.activo = true AND s.cantidad > 0
          ORDER BY t.id_talla
        `;
        
        const tallasResult = await db.query(tallasQuery, [product.id_producto]);
        product.tallas_disponibles = tallasResult.rows;
      }
      
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
          COALESCE(c.nombre, 'Sin categoría') as categoria,
          COUNT(DISTINCT p.id_producto) as total_productos,
          COUNT(DISTINCT v.id_variante) FILTER (WHERE v.activo = true) as variantes_activas
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        WHERE p.activo = true AND p.id_categoria IS NOT NULL
        GROUP BY c.nombre
        HAVING COUNT(DISTINCT p.id_producto) > 0
        ORDER BY c.nombre ASC
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
        whereConditions.push(`p.id_categoria = $${paramIndex}`);
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
          p.id_categoria,
          p.marca,
          p.activo,
          p.fecha_creacion,
          st.nombre as sistema_talla,
          COUNT(DISTINCT v.id_variante) as total_variantes,
          COUNT(DISTINCT v.id_variante) FILTER (WHERE v.activo = true) as variantes_activas,
          COALESCE(SUM(stock_info.stock_total), 0) as stock_total,
          MIN(stock_precios.precio) as precio_minimo,
          MAX(stock_precios.precio) as precio_maximo,
          iv.url as imagen_principal,
          iv.public_id as imagen_public_id
        FROM productos p
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN variantes v ON p.id_producto = v.id_producto
        LEFT JOIN (
          SELECT 
            id_variante,
            MIN(precio) as precio
          FROM stock
          WHERE precio IS NOT NULL
          GROUP BY id_variante
        ) stock_precios ON v.id_variante = stock_precios.id_variante
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
        INSERT INTO variantes (id_producto, nombre, activo)
        VALUES ($1, $2, true)
        RETURNING *
      `;

      const variantResult = await client.query(variantQuery, [
        newProduct.id_producto,
        variante.nombre
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
        INSERT INTO variantes (id_producto, nombre, activo, fecha_creacion)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await db.query(query, [
        variantData.id_producto,
        variantData.nombre,
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
          p.id_categoria,
          p.marca,
          p.id_sistema_talla,
          st.nombre as sistema_talla,
          COALESCE(img.imagenes, '[]'::json) as imagenes,
          COALESCE(stock_info.tallas_stock, '[]'::json) as tallas_stock,
          COALESCE(stock_info.stock_total, 0) as stock_total,
          precios_info.precio_minimo,
          precios_info.precio_maximo,
          precios_info.precios_distintos,
          precios_info.precio_unico
        FROM variantes v
        JOIN productos p ON v.id_producto = p.id_producto
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
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
                'cantidad', COALESCE(s.cantidad, 0),
                'precio', s.precio,
                'orden', t.orden
              ) ORDER BY t.orden, t.id_talla
            ) as tallas_stock
          FROM tallas t
          LEFT JOIN stock s ON s.id_talla = t.id_talla AND s.id_variante = $1
          WHERE t.id_sistema_talla = (
            SELECT p2.id_sistema_talla 
            FROM productos p2 
            INNER JOIN variantes v2 ON p2.id_producto = v2.id_producto 
            WHERE v2.id_variante = $1
          )
          GROUP BY s.id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        LEFT JOIN (
          SELECT 
            s.id_variante,
            MIN(s.precio) as precio_minimo,
            MAX(s.precio) as precio_maximo,
            COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
            CASE 
              WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
              ELSE false
            END as precio_unico
          FROM stock s
          WHERE s.id_variante = $1
          GROUP BY s.id_variante
        ) precios_info ON v.id_variante = precios_info.id_variante
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

  // Buscar productos por nombre o descripción
  static async searchProducts(searchTerm, limit = 10, offset = 0) {
    try {
      // Consulta simplificada para debug
      const query = `
        SELECT 
          p.id_producto,
          p.nombre,
          p.descripcion,
          p.id_categoria,
          p.marca,
          p.activo,
          (
            SELECT MIN(s.precio)
            FROM stock s
            JOIN variantes v ON s.id_variante = v.id_variante
            WHERE v.id_producto = p.id_producto
          ) as precio_desde
        FROM productos p
        WHERE p.activo = true
        AND (
          p.nombre ILIKE $1 
          OR p.descripcion ILIKE $1 
          OR p.marca ILIKE $1
        )
        ORDER BY p.nombre ASC
        LIMIT $2 OFFSET $3
      `;

      const searchPattern = `%${searchTerm}%`;
      
      const result = await db.query(query, [
        searchPattern, 
        limit, 
        offset
      ]);
      
      return result.rows;
    } catch (error) {
      console.error('Error en searchProducts:', error);
      throw error;
    }
  }

  // Obtener todas las categorías disponibles
  static async getCategories() {
    try {
      const query = `
        SELECT 
          c.id_categoria as id,
          c.nombre as name,
          LOWER(REPLACE(c.nombre, ' ', '-')) as slug,
          c.descripcion as description,
          c.activo,
          COUNT(p.id_producto) as total_productos
        FROM categorias c
        LEFT JOIN productos p ON c.id_categoria = p.id_categoria AND p.activo = true
        WHERE c.activo = true
        GROUP BY c.id_categoria, c.nombre, c.descripcion, c.activo, c.orden
        HAVING COUNT(p.id_producto) > 0
        ORDER BY c.orden ASC, c.nombre ASC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getCategories:', error);
      throw error;
    }
  }
}

module.exports = ProductModel;
