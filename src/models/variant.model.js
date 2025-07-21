const db = require('../config/db');

const VariantModel = {
  // Crear nueva variante para un producto existente
  async createVariant(variantData) {
    try {
      const { id_producto, nombre, precio, precio_original } = variantData;

      const query = `
        INSERT INTO variantes (id_producto, nombre, precio, precio_original, activo)
        VALUES ($1, $2, $3, $4, true)
        RETURNING *
      `;

      const result = await db.query(query, [
        id_producto,
        nombre,
        precio,
        precio_original
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error en createVariant:', error);
      throw error;
    }
  },

  // Obtener todas las variantes de un producto
  async getVariantsByProduct(id_producto) {
    try {
      const query = `
        SELECT 
          v.*,
          CASE 
            WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
            THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
            ELSE NULL
          END as descuento_porcentaje,
          COALESCE(stock_info.stock_total, 0) as stock_disponible,
          json_agg(
            json_build_object(
              'id_imagen', iv.id_imagen,
              'url', iv.url,
              'public_id', iv.public_id,
              'orden', iv.orden
            ) ORDER BY iv.orden
          ) FILTER (WHERE iv.id_imagen IS NOT NULL) as imagenes
        FROM variantes v
        LEFT JOIN (
          SELECT 
            id_variante,
            SUM(cantidad) as stock_total
          FROM stock
          GROUP BY id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
        WHERE v.id_producto = $1
        GROUP BY v.id_variante, stock_info.stock_total
        ORDER BY v.fecha_creacion DESC
      `;

      const result = await db.query(query, [id_producto]);
      return result.rows;

    } catch (error) {
      console.error('Error en getVariantsByProduct:', error);
      throw error;
    }
  },

  // Actualizar variante
  async updateVariant(id_variante, updateData) {
    try {
      const { nombre, precio, precio_original, activo } = updateData;

      const query = `
        UPDATE variantes 
        SET 
          nombre = COALESCE($2, nombre),
          precio = COALESCE($3, precio),
          precio_original = COALESCE($4, precio_original),
          activo = COALESCE($5, activo)
        WHERE id_variante = $1
        RETURNING *
      `;

      const result = await db.query(query, [
        id_variante,
        nombre,
        precio,
        precio_original,
        activo
      ]);

      return result.rows[0];

    } catch (error) {
      console.error('Error en updateVariant:', error);
      throw error;
    }
  },

  // Eliminar variante
  async deleteVariant(id_variante) {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Obtener imágenes para eliminar de Cloudinary
      const imagesQuery = `
        SELECT public_id FROM imagenes_variante 
        WHERE id_variante = $1
      `;
      const imagesResult = await client.query(imagesQuery, [id_variante]);

      // Eliminar variante (esto eliminará en cascada stock e imágenes)
      const deleteQuery = `
        DELETE FROM variantes 
        WHERE id_variante = $1 
        RETURNING *
      `;

      const result = await client.query(deleteQuery, [id_variante]);

      await client.query('COMMIT');

      return {
        deletedVariant: result.rows[0],
        imagesToDelete: imagesResult.rows.map(row => row.public_id)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en deleteVariant:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Obtener variante por ID con toda la información
  async getById(id_variante) {
    try {
      const query = `
        SELECT 
          v.*,
          p.nombre as producto_nombre,
          p.categoria,
          p.marca,
          CASE 
            WHEN v.precio_original IS NOT NULL AND v.precio_original > v.precio 
            THEN ROUND(((v.precio_original - v.precio) / v.precio_original * 100)::numeric, 2)
            ELSE NULL
          END as descuento_porcentaje,
          COALESCE(stock_info.stock_total, 0) as stock_disponible,
          json_agg(
            json_build_object(
              'id_imagen', iv.id_imagen,
              'url', iv.url,
              'public_id', iv.public_id,
              'orden', iv.orden
            ) ORDER BY iv.orden
          ) FILTER (WHERE iv.id_imagen IS NOT NULL) as imagenes
        FROM variantes v
        JOIN productos p ON v.id_producto = p.id_producto
        LEFT JOIN (
          SELECT 
            id_variante,
            SUM(cantidad) as stock_total
          FROM stock
          GROUP BY id_variante
        ) stock_info ON v.id_variante = stock_info.id_variante
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
        WHERE v.id_variante = $1
        GROUP BY v.id_variante, p.nombre, p.categoria, p.marca, stock_info.stock_total
      `;

      const result = await db.query(query, [id_variante]);
      return result.rows[0];

    } catch (error) {
      console.error('Error en getById:', error);
      throw error;
    }
  }
};

module.exports = VariantModel;
