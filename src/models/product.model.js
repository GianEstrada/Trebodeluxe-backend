const db = require('../config/db');

const ProductModel = {
  // Obtener todos los productos con sus variantes, imágenes y stock
  async getAll() {
    const query = `
      SELECT DISTINCT
        p.id_producto,
        p.nombre as producto_nombre,
        p.descripcion,
        p.categoria,
        p.marca,
        p.activo,
        st.nombre as sistema_talla_nombre,
        -- Obtener la variante con menor precio
        MIN(v.precio) as precio_minimo,
        -- Obtener la primera imagen disponible
        (SELECT iv.url 
         FROM variantes vf 
         JOIN imagenes_variante iv ON vf.id_variante = iv.id_variante 
         WHERE vf.id_producto = p.id_producto 
         AND iv.orden = 1 
         LIMIT 1) as imagen_principal,
        -- Verificar si hay stock disponible
        CASE 
          WHEN EXISTS(
            SELECT 1 FROM stock s 
            JOIN variantes v2 ON s.id_variante = v2.id_variante 
            WHERE v2.id_producto = p.id_producto AND s.cantidad > 0
          ) THEN true 
          ELSE false 
        END as tiene_stock
      FROM productos p
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      WHERE p.activo = true
      GROUP BY p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca, p.activo, st.nombre
      ORDER BY p.fecha_creacion DESC
    `;
    
    const result = await db.query(query);
    return result.rows;
  },

  // Obtener producto por ID con todas sus variantes, imágenes y stock
  async getById(id) {
    const productQuery = `
      SELECT 
        p.*,
        st.nombre as sistema_talla_nombre
      FROM productos p
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      WHERE p.id_producto = $1 AND p.activo = true
    `;
    
    const variantesQuery = `
      SELECT 
        v.*,
        array_agg(
          json_build_object(
            'id_imagen', iv.id_imagen,
            'url', iv.url,
            'public_id', iv.public_id,
            'orden', iv.orden
          ) ORDER BY iv.orden
        ) as imagenes
      FROM variantes v
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
      WHERE v.id_producto = $1 AND v.activo = true
      GROUP BY v.id_variante
      ORDER BY v.fecha_creacion
    `;
    
    const tallasQuery = `
      SELECT DISTINCT
        t.id_talla,
        t.nombre_talla,
        t.orden
      FROM tallas t
      JOIN sistemas_talla st ON t.id_sistema_talla = st.id_sistema_talla
      JOIN productos p ON p.id_sistema_talla = st.id_sistema_talla
      WHERE p.id_producto = $1
      ORDER BY t.orden
    `;
    
    const stockQuery = `
      SELECT 
        s.*,
        t.nombre_talla,
        v.nombre as variante_nombre
      FROM stock s
      JOIN tallas t ON s.id_talla = t.id_talla
      JOIN variantes v ON s.id_variante = v.id_variante
      WHERE s.id_producto = $1
    `;

    const [productResult, variantesResult, tallasResult, stockResult] = await Promise.all([
      db.query(productQuery, [id]),
      db.query(variantesQuery, [id]),
      db.query(tallasQuery, [id]),
      db.query(stockQuery, [id])
    ]);

    if (productResult.rows.length === 0) {
      return null;
    }

    const product = productResult.rows[0];
    product.variantes = variantesResult.rows;
    product.tallas_disponibles = tallasResult.rows;
    product.stock = stockResult.rows;

    return product;
  },

  // Obtener productos por categoría
  async getByCategory(categoria) {
    const query = `
      SELECT DISTINCT
        p.id_producto,
        p.nombre as producto_nombre,
        p.descripcion,
        p.categoria,
        p.marca,
        p.activo,
        MIN(v.precio) as precio_minimo,
        (SELECT iv.url 
         FROM variantes vf 
         JOIN imagenes_variante iv ON vf.id_variante = iv.id_variante 
         WHERE vf.id_producto = p.id_producto 
         AND iv.orden = 1 
         LIMIT 1) as imagen_principal,
        CASE 
          WHEN EXISTS(
            SELECT 1 FROM stock s 
            JOIN variantes v2 ON s.id_variante = v2.id_variante 
            WHERE v2.id_producto = p.id_producto AND s.cantidad > 0
          ) THEN true 
          ELSE false 
        END as tiene_stock
      FROM productos p
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      WHERE p.activo = true AND LOWER(p.categoria) = LOWER($1)
      GROUP BY p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca, p.activo
      ORDER BY p.fecha_creacion DESC
    `;
    
    const result = await db.query(query, [categoria]);
    return result.rows;
  },

  // Buscar productos por nombre, descripción, categoría o marca
  async search(searchTerm) {
    const query = `
      SELECT DISTINCT
        p.id_producto,
        p.nombre as producto_nombre,
        p.descripcion,
        p.categoria,
        p.marca,
        p.activo,
        MIN(v.precio) as precio_minimo,
        (SELECT iv.url 
         FROM variantes vf 
         JOIN imagenes_variante iv ON vf.id_variante = iv.id_variante 
         WHERE vf.id_producto = p.id_producto 
         AND iv.orden = 1 
         LIMIT 1) as imagen_principal,
        CASE 
          WHEN EXISTS(
            SELECT 1 FROM stock s 
            JOIN variantes v2 ON s.id_variante = v2.id_variante 
            WHERE v2.id_producto = p.id_producto AND s.cantidad > 0
          ) THEN true 
          ELSE false 
        END as tiene_stock
      FROM productos p
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      WHERE p.activo = true 
      AND (
        LOWER(p.nombre) LIKE LOWER($1) OR 
        LOWER(p.descripcion) LIKE LOWER($1) OR 
        LOWER(p.categoria) LIKE LOWER($1) OR 
        LOWER(p.marca) LIKE LOWER($1) OR
        LOWER(v.nombre) LIKE LOWER($1)
      )
      GROUP BY p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca, p.activo
      ORDER BY p.fecha_creacion DESC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const result = await db.query(query, [searchPattern]);
    return result.rows;
  },

  // Obtener stock específico por producto, variante y talla
  async getStock(idProducto, idVariante, idTalla) {
    const query = `
      SELECT cantidad 
      FROM stock 
      WHERE id_producto = $1 AND id_variante = $2 AND id_talla = $3
    `;
    
    const result = await db.query(query, [idProducto, idVariante, idTalla]);
    return result.rows.length > 0 ? result.rows[0].cantidad : 0;
  },

  // Crear producto nuevo (solo para admin)
  async create(productData) {
    const { nombre, descripcion, categoria, marca, id_sistema_talla } = productData;
    
    const query = `
      INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [nombre, descripcion, categoria, marca, id_sistema_talla]);
    return result.rows[0];
  },

  // Crear variante de producto (solo para admin)
  async createVariante(varianteData) {
    const { id_producto, nombre, precio, precio_original } = varianteData;
    
    const query = `
      INSERT INTO variantes (id_producto, nombre, precio, precio_original)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [id_producto, nombre, precio, precio_original]);
    return result.rows[0];
  },

  // Agregar imagen a variante (solo para admin)
  async addImageToVariant(imageData) {
    const { id_variante, url, public_id, orden } = imageData;
    
    const query = `
      INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [id_variante, url, public_id, orden]);
    return result.rows[0];
  },

  // Actualizar stock (solo para admin)
  async updateStock(stockData) {
    const { id_producto, id_variante, id_talla, cantidad } = stockData;
    
    const query = `
      INSERT INTO stock (id_producto, id_variante, id_talla, cantidad)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_producto, id_variante, id_talla)
      DO UPDATE SET 
        cantidad = $4,
        fecha_actualizacion = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [id_producto, id_variante, id_talla, cantidad]);
    return result.rows[0];
  },

  // Obtener todas las categorías disponibles
  async getCategories() {
    const query = `
      SELECT DISTINCT categoria 
      FROM productos 
      WHERE activo = true AND categoria IS NOT NULL
      ORDER BY categoria
    `;
    
    const result = await db.query(query);
    return result.rows.map(row => row.categoria);
  },

  // Obtener todas las marcas disponibles
  async getBrands() {
    const query = `
      SELECT DISTINCT marca 
      FROM productos 
      WHERE activo = true AND marca IS NOT NULL
      ORDER BY marca
    `;
    
    const result = await db.query(query);
    return result.rows.map(row => row.marca);
  },

  // Obtener sistemas de tallas
  async getSizeSystems() {
    const query = `
      SELECT 
        st.*,
        array_agg(
          json_build_object(
            'id_talla', t.id_talla,
            'nombre_talla', t.nombre_talla,
            'orden', t.orden
          ) ORDER BY t.orden
        ) as tallas
      FROM sistemas_talla st
      LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla
      GROUP BY st.id_sistema_talla
      ORDER BY st.nombre
    `;
    
    const result = await db.query(query);
    return result.rows;
  }
};

module.exports = ProductModel;