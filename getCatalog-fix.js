// FUNCIÓN getCatalog CORREGIDA - Incluye variantes y tallas como getFeatured

// Obtener productos para catálogo con imagen principal
static async getCatalog(limit = 20, offset = 0, categoria = null, sortBy = 'fecha_creacion', sortOrder = 'DESC') {
  try {
    let whereClause = 'WHERE p.activo = true';
    let params = [limit, offset];
    let paramIndex = 3;

    if (categoria) {
      // Manejar tanto ID numérico como slug de categoría
      if (typeof categoria === 'number' || /^\d+$/.test(categoria)) {
        // Si es un ID numérico, filtrar por id_categoria
        whereClause += ` AND p.id_categoria = $${paramIndex}`;
        params.push(parseInt(categoria));
      } else {
        // Si es un string, filtrar por slug de categoría
        whereClause += ` AND LOWER(REPLACE(c.nombre, ' ', '-')) = $${paramIndex}`;
        params.push(categoria.toLowerCase());
      }
      paramIndex++;
    }

    // Validar sortBy para evitar inyección SQL
    const validSortFields = ['fecha_creacion', 'nombre', 'precio_min', 'categoria'];
    const validSortOrder = ['ASC', 'DESC'];
    
    if (!validSortFields.includes(sortBy)) sortBy = 'fecha_creacion';
    if (!validSortOrder.includes(sortOrder.toUpperCase())) sortOrder = 'DESC';

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
      ${whereClause}
      GROUP BY p.id_producto, p.nombre, p.descripcion, p.id_categoria, p.marca, 
               p.id_sistema_talla, p.activo, p.fecha_creacion, c.nombre
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;

    console.log('Query catálogo:', query);
    console.log('Parámetros:', params);

    const result = await db.query(query, params);

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
    
    // Obtener total de productos para paginación
    const countQuery = `
      SELECT COUNT(DISTINCT p.id_producto) as total
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      ${categoria ? (typeof categoria === 'number' || /^\d+$/.test(categoria) ? 
        'WHERE p.activo = true AND p.id_categoria = $1' : 
        'WHERE p.activo = true AND LOWER(REPLACE(c.nombre, \' \', \'-\')) = $1') : 
        'WHERE p.activo = true'}
    `;

    const countParams = categoria ? [typeof categoria === 'number' || /^\d+$/.test(categoria) ? 
      parseInt(categoria) : categoria.toLowerCase()] : [];
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