const pool = require('../config/db');

/**
 * Crear variante con nuevo sistema de precios en stock
 */
const createVariantWithStockPricing = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      id_producto,
      nombre,
      imagen_url,
      imagen_public_id,
      imagenes,
      tallas,
      precio_unico, // nuevo campo: true = precio único, false = precio por talla
      precio_base,  // precio para todas las tallas si precio_unico = true
      precio_original_base
    } = req.body;

    // 1. Crear variante SIN precios (los precios van en stock)
    const variantQuery = `
      INSERT INTO variantes (id_producto, nombre)
      VALUES ($1, $2)
      RETURNING id_variante;
    `;
    
    const variantResult = await client.query(variantQuery, [
      id_producto,
      nombre
    ]);
    
    const id_variante = variantResult.rows[0].id_variante;

    // 2. Agregar imágenes si existen
    if (imagenes && imagenes.length > 0) {
      for (let i = 0; i < imagenes.length; i++) {
        const imagen = imagenes[i];
        if (imagen.url && imagen.public_id) {
          const imageQuery = `
            INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
            VALUES ($1, $2, $3, $4);
          `;
          
          await client.query(imageQuery, [
            id_variante,
            imagen.url,
            imagen.public_id,
            i + 1
          ]);
        }
      }
    }
    // Fallback para compatibilidad con formato anterior
    else if (imagen_url && imagen_public_id) {
      const imageQuery = `
        INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
        VALUES ($1, $2, $3, 1);
      `;
      
      await client.query(imageQuery, [
        id_variante,
        imagen_url,
        imagen_public_id
      ]);
    }

    // 3. Agregar stock con precios
    if (tallas && tallas.length > 0) {
      for (const talla of tallas) {
        if (talla.cantidad > 0) {
          let precio_talla = precio_base;
          let precio_original_talla = precio_original_base;
          
          // Si no es precio único, usar precios específicos por talla
          if (!precio_unico) {
            precio_talla = talla.precio || precio_base;
            precio_original_talla = talla.precio_original || precio_original_base;
          }
          
          const stockQuery = `
            INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio, precio_original)
            VALUES ($1, $2, $3, $4, $5, $6);
          `;
          
          await client.query(stockQuery, [
            id_producto,
            id_variante,
            talla.id_talla,
            talla.cantidad,
            precio_talla,
            precio_original_talla
          ]);
        }
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Variante creada exitosamente con nuevo sistema de precios',
      id_variante: id_variante
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating variant with stock pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear variante',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Actualizar variante con nuevo sistema de precios
 */
const updateVariantWithStockPricing = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id_variante } = req.params;
    const { 
      nombre,
      precio_unico,
      precio_base,
      precio_original_base,
      tallas 
    } = req.body;

    // 1. Actualizar variante (solo nombre, sin precios)
    const updateVariantQuery = `
      UPDATE variantes 
      SET nombre = $1
      WHERE id_variante = $2;
    `;
    
    await client.query(updateVariantQuery, [nombre, id_variante]);

    // 2. Actualizar precios en stock
    if (tallas && tallas.length > 0) {
      for (const talla of tallas) {
        let precio_talla = precio_base;
        let precio_original_talla = precio_original_base;
        
        // Si no es precio único, usar precios específicos por talla
        if (!precio_unico) {
          precio_talla = talla.precio || precio_base;
          precio_original_talla = talla.precio_original || precio_original_base;
        }
        
        const updateStockQuery = `
          UPDATE stock 
          SET cantidad = $1, precio = $2, precio_original = $3
          WHERE id_variante = $4 AND id_talla = $5;
        `;
        
        await client.query(updateStockQuery, [
          talla.cantidad,
          precio_talla,
          precio_original_talla,
          id_variante,
          talla.id_talla
        ]);
      }
    }

    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Variante actualizada exitosamente'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating variant with stock pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar variante',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Obtener variantes con precios desde stock
 */
const getVariantsWithStockPricing = async (req, res) => {
  try {
    const query = `
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        v.activo as variante_activa,
        p.id_producto,
        p.nombre as nombre_producto,
        p.descripcion as descripcion_producto,
        p.categoria,
        p.marca,
        c.nombre as categoria_nombre,
        st.nombre as sistema_talla,
        iv.url as imagen_url,
        iv.public_id as imagen_public_id,
        -- Obtener el primer precio para mostrar como precio base
        (SELECT s.precio FROM stock s WHERE s.id_variante = v.id_variante AND s.precio IS NOT NULL LIMIT 1) as precio_base,
        (SELECT s.precio_original FROM stock s WHERE s.id_variante = v.id_variante AND s.precio_original IS NOT NULL LIMIT 1) as precio_original_base,
        -- Verificar si tiene precio único (todos los stocks tienen el mismo precio)
        (SELECT COUNT(DISTINCT s.precio) FROM stock s WHERE s.id_variante = v.id_variante AND s.precio IS NOT NULL) <= 1 as precio_unico,
        COALESCE(
          JSON_AGG(
            CASE WHEN t.id_talla IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'cantidad', COALESCE(s.cantidad, 0),
                'precio', s.precio,
                'precio_original', s.precio_original
              )
            END
          ) FILTER (WHERE t.id_talla IS NOT NULL), '[]'
        ) as tallas_stock
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
      LEFT JOIN tallas t ON t.id_sistema_talla = p.id_sistema_talla
      LEFT JOIN stock s ON s.id_variante = v.id_variante AND s.id_talla = t.id_talla
      WHERE p.activo = true AND v.activo = true
      GROUP BY v.id_variante, v.nombre, v.activo,
               p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca,
               c.nombre, st.nombre, iv.url, iv.public_id
      ORDER BY p.nombre, v.nombre;
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      variants: result.rows
    });
    
  } catch (error) {
    console.error('Error getting variants with stock pricing:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener variantes',
      error: error.message
    });
  }
};

module.exports = {
  createVariantWithStockPricing,
  updateVariantWithStockPricing,
  getVariantsWithStockPricing
};
