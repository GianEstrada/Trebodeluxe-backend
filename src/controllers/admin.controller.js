const { pool } = require('../config/db');
const { uploadImage, deleteImage, cleanupTempFile } = require('../config/cloudinary');

// Obtener todas las variantes con información completa
const getAllVariants = async (req, res) => {
  try {
    const query = `
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        v.precio,
        v.precio_original,
        v.activo as variante_activa,
        p.id_producto,
        p.nombre as nombre_producto,
        p.descripcion as descripcion_producto,
        p.categoria,
        p.marca,
        st.nombre as sistema_talla,
        iv.url as imagen_url,
        iv.public_id as imagen_public_id,
        COALESCE(
          JSON_AGG(
            CASE WHEN t.id_talla IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id_talla', t.id_talla,
                'nombre_talla', t.nombre_talla,
                'cantidad', COALESCE(s.cantidad, 0)
              )
            END
          ) FILTER (WHERE t.id_talla IS NOT NULL), '[]'
        ) as tallas_stock
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
      LEFT JOIN tallas t ON t.id_sistema_talla = p.id_sistema_talla
      LEFT JOIN stock s ON s.id_variante = v.id_variante AND s.id_talla = t.id_talla
      WHERE p.activo = true AND v.activo = true
      GROUP BY v.id_variante, v.nombre, v.precio, v.precio_original, v.activo,
               p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca,
               st.nombre, iv.url, iv.public_id
      ORDER BY p.nombre, v.nombre;
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      variants: result.rows
    });
  } catch (error) {
    console.error('Error al obtener variantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener todos los productos para el dropdown
const getAllProducts = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_producto,
        p.nombre,
        p.categoria,
        st.id_sistema_talla,
        st.nombre as sistema_talla
      FROM productos p
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      WHERE p.activo = true
      ORDER BY p.nombre;
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener todos los sistemas de tallas
const getSizeSystems = async (req, res) => {
  try {
    const query = `
      SELECT 
        st.id_sistema_talla,
        st.nombre,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_talla', t.id_talla,
            'nombre_talla', t.nombre_talla,
            'orden', t.orden
          ) ORDER BY t.orden
        ) as tallas
      FROM sistemas_talla st
      LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla
      GROUP BY st.id_sistema_talla, st.nombre
      ORDER BY st.nombre;
    `;
    
    const result = await pool.query(query);
    res.json({
      success: true,
      sizeSystems: result.rows
    });
  } catch (error) {
    console.error('Error al obtener sistemas de tallas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo producto con variante
const createProductWithVariant = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      producto_nombre, 
      producto_descripcion, 
      categoria,
      marca,
      id_sistema_talla,
      variantes 
    } = req.body;

    // Crear producto
    const productQuery = `
      INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_producto;
    `;
    
    const productResult = await client.query(productQuery, [
      producto_nombre, 
      producto_descripcion, 
      categoria, 
      marca, 
      id_sistema_talla
    ]);
    
    const id_producto = productResult.rows[0].id_producto;

    // Crear variantes
    for (const variante of variantes) {
      // Crear variante
      const variantQuery = `
        INSERT INTO variantes (id_producto, nombre, precio, precio_original)
        VALUES ($1, $2, $3, $4)
        RETURNING id_variante;
      `;
      
      const variantResult = await client.query(variantQuery, [
        id_producto,
        variante.nombre,
        variante.precio,
        variante.precio_original || null
      ]);
      
      const id_variante = variantResult.rows[0].id_variante;

      // Agregar imágenes si existen
      if (variante.imagenes && variante.imagenes.length > 0) {
        for (let i = 0; i < variante.imagenes.length; i++) {
          const imagen = variante.imagenes[i];
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
      else if (variante.imagen_url && variante.imagen_public_id) {
        const imageQuery = `
          INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
          VALUES ($1, $2, $3, 1);
        `;
        
        await client.query(imageQuery, [
          id_variante,
          variante.imagen_url,
          variante.imagen_public_id
        ]);
      }

      // Agregar stock por tallas
      if (variante.tallas && variante.tallas.length > 0) {
        for (const talla of variante.tallas) {
          if (talla.cantidad > 0) {
            const stockQuery = `
              INSERT INTO stock (id_producto, id_variante, id_talla, cantidad)
              VALUES ($1, $2, $3, $4);
            `;
            
            await client.query(stockQuery, [
              id_producto,
              id_variante,
              talla.id_talla,
              talla.cantidad
            ]);
          }
        }
      }
    }

    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Producto y variantes creados correctamente',
      id_producto
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear producto con variantes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

// Crear nueva variante para producto existente
const createVariantForProduct = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      id_producto,
      nombre,
      precio,
      precio_original,
      imagen_url,
      imagen_public_id,
      imagenes,
      tallas 
    } = req.body;

    // Crear variante
    const variantQuery = `
      INSERT INTO variantes (id_producto, nombre, precio, precio_original)
      VALUES ($1, $2, $3, $4)
      RETURNING id_variante;
    `;
    
    const variantResult = await client.query(variantQuery, [
      id_producto,
      nombre,
      precio,
      precio_original || null
    ]);
    
    const id_variante = variantResult.rows[0].id_variante;

    // Agregar imágenes si existen (formato nuevo con array)
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

    // Agregar stock por tallas
    if (tallas && tallas.length > 0) {
      for (const talla of tallas) {
        if (talla.cantidad > 0) {
          const stockQuery = `
            INSERT INTO stock (id_producto, id_variante, id_talla, cantidad)
            VALUES ($1, $2, $3, $4);
          `;
          
          await client.query(stockQuery, [
            id_producto,
            id_variante,
            talla.id_talla,
            talla.cantidad
          ]);
        }
      }
    }

    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Variante creada correctamente',
      id_variante
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear variante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

// Subir imagen a Cloudinary
const uploadImageToCloudinary = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    console.log('Subiendo imagen:', req.file.path);

    // Subir imagen a Cloudinary usando la función centralizada
    const result = await uploadImage(req.file.path, 'productos');

    // Limpiar archivo temporal
    cleanupTempFile(req.file.path);

    res.json({
      success: true,
      url: result.url,
      public_id: result.public_id,
      message: 'Imagen subida exitosamente'
    });
    
  } catch (error) {
    console.error('Error al subir imagen:', error);
    
    // Limpiar archivo temporal en caso de error
    if (req.file && req.file.path) {
      cleanupTempFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al subir la imagen',
      error: error.message
    });
  }
};

// Eliminar producto
const deleteProduct = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Verificar que el producto existe
    const checkQuery = 'SELECT id_producto FROM productos WHERE id_producto = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    // Marcar como inactivo en lugar de eliminar (soft delete)
    const deleteQuery = 'UPDATE productos SET activo = false WHERE id_producto = $1';
    await client.query(deleteQuery, [id]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Producto eliminado correctamente'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

// Obtener producto por ID para edición
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        p.id_producto,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.marca,
        p.id_sistema_talla,
        st.nombre as sistema_talla,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id_variante', v.id_variante,
            'nombre', v.nombre,
            'precio', v.precio,
            'precio_original', v.precio_original,
            'activo', v.activo,
            'imagenes', COALESCE(imagenes.imagenes, '[]'::json),
            'tallas', COALESCE(tallas.tallas, '[]'::json)
          )
        ) as variantes
      FROM productos p
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      LEFT JOIN (
        SELECT 
          id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'url', url,
              'public_id', public_id,
              'orden', orden
            ) ORDER BY orden
          ) as imagenes
        FROM imagenes_variante
        GROUP BY id_variante
      ) imagenes ON v.id_variante = imagenes.id_variante
      LEFT JOIN (
        SELECT 
          s.id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'cantidad', s.cantidad
            )
          ) as tallas
        FROM stock s
        JOIN tallas t ON s.id_talla = t.id_talla
        GROUP BY s.id_variante
      ) tallas ON v.id_variante = tallas.id_variante
      WHERE p.id_producto = $1 AND p.activo = true
      GROUP BY p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca, 
               p.id_sistema_talla, st.nombre;
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      product: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar producto
const updateProduct = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      nombre, 
      descripcion, 
      categoria,
      marca,
      id_sistema_talla
    } = req.body;
    
    // Actualizar producto
    const updateQuery = `
      UPDATE productos 
      SET nombre = $1, descripcion = $2, categoria = $3, marca = $4, id_sistema_talla = $5
      WHERE id_producto = $6 AND activo = true
      RETURNING id_producto;
    `;
    
    const result = await client.query(updateQuery, [
      nombre, descripcion, categoria, marca, id_sistema_talla, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Producto actualizado correctamente'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

// Eliminar variante
const deleteVariant = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Verificar que la variante existe y obtener el ID del producto
    const checkQuery = 'SELECT id_variante, id_producto FROM variantes WHERE id_variante = $1';
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Variante no encontrada'
      });
    }
    
    const { id_producto } = checkResult.rows[0];
    
    // Marcar como inactiva en lugar de eliminar (soft delete)
    const deleteQuery = 'UPDATE variantes SET activo = false WHERE id_variante = $1';
    await client.query(deleteQuery, [id]);
    
    // Verificar si todas las variantes del producto están inactivas
    const activeVariantsQuery = `
      SELECT COUNT(*) as active_count 
      FROM variantes 
      WHERE id_producto = $1 AND activo = true
    `;
    const activeVariantsResult = await client.query(activeVariantsQuery, [id_producto]);
    
    // Si no hay variantes activas, marcar el producto como inactivo
    if (parseInt(activeVariantsResult.rows[0].active_count) === 0) {
      const deactivateProductQuery = 'UPDATE productos SET activo = false WHERE id_producto = $1';
      await client.query(deactivateProductQuery, [id_producto]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Variante eliminada correctamente'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar variante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

// Obtener variante por ID para edición
const getVariantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        v.precio,
        v.precio_original,
        v.activo,
        v.id_producto,
        p.nombre as nombre_producto,
        p.descripcion as descripcion_producto,
        p.categoria,
        p.marca,
        p.id_sistema_talla,
        st.nombre as sistema_talla,
        COALESCE(img.imagenes, '[]'::json) as imagenes,
        COALESCE(stock_info.tallas_stock, '[]'::json) as tallas_stock
      FROM variantes v
      INNER JOIN productos p ON v.id_producto = p.id_producto
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN (
        SELECT 
          id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_imagen', id_imagen,
              'url', url,
              'public_id', public_id,
              'orden', orden
            ) ORDER BY orden
          ) as imagenes
        FROM imagenes_variante
        WHERE id_variante = $1
        GROUP BY id_variante
      ) img ON v.id_variante = img.id_variante
      LEFT JOIN (
        SELECT 
          s.id_variante,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'cantidad', COALESCE(s.cantidad, 0)
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
      WHERE v.id_variante = $1 AND v.activo = true AND p.activo = true;
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Variante no encontrada'
      });
    }
    
    res.json({
      success: true,
      variant: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al obtener variante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar variante
const updateVariant = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { 
      // Datos del producto (opcionales)
      id_producto,
      nombre_producto,
      categoria,
      descripcion_producto,
      marca,
      // Datos de la variante
      nombre_variante,
      nombre,
      precio,
      precio_original,
      imagenes,
      tallas
    } = req.body;
    
    // Usar nombre_variante si existe, sino usar nombre para compatibilidad
    const variantName = nombre_variante || nombre;
    
    // Si se proporcionan datos del producto, actualizarlos
    if (id_producto && (nombre_producto || categoria || descripcion_producto || marca)) {
      const productUpdateQuery = `
        UPDATE productos 
        SET 
          nombre = COALESCE($1, nombre),
          categoria = COALESCE($2, categoria),
          descripcion = COALESCE($3, descripcion),
          marca = COALESCE($4, marca)
        WHERE id_producto = $5 AND activo = true
        RETURNING id_producto;
      `;
      
      const productResult = await client.query(productUpdateQuery, [
        nombre_producto, categoria, descripcion_producto, marca, id_producto
      ]);
      
      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }
    }
    
    // Actualizar variante
    const updateQuery = `
      UPDATE variantes 
      SET nombre = $1, precio = $2, precio_original = $3
      WHERE id_variante = $4 AND activo = true
      RETURNING id_variante;
    `;
    
    const result = await client.query(updateQuery, [
      variantName, precio, precio_original || null, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Variante no encontrada'
      });
    }
    
    // Actualizar imágenes si se proporcionan
    if (imagenes && imagenes.length > 0) {
      // Eliminar imágenes existentes
      await client.query('DELETE FROM imagenes_variante WHERE id_variante = $1', [id]);
      
      // Agregar nuevas imágenes
      for (let i = 0; i < imagenes.length; i++) {
        const imagen = imagenes[i];
        if (imagen.url && imagen.public_id) {
          const imageQuery = `
            INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
            VALUES ($1, $2, $3, $4);
          `;
          
          await client.query(imageQuery, [
            id,
            imagen.url,
            imagen.public_id,
            i + 1
          ]);
        }
      }
    }
    
    // Actualizar stock por tallas si se proporciona
    if (tallas && tallas.length > 0) {
      // Eliminar stock existente
      await client.query('DELETE FROM stock WHERE id_variante = $1', [id]);
      
      // Obtener id_producto para el stock
      const productQuery = 'SELECT id_producto FROM variantes WHERE id_variante = $1';
      const productResult = await client.query(productQuery, [id]);
      const id_producto = productResult.rows[0].id_producto;
      
      // Agregar nuevo stock
      for (const talla of tallas) {
        if (talla.cantidad > 0) {
          const stockQuery = `
            INSERT INTO stock (id_producto, id_variante, id_talla, cantidad)
            VALUES ($1, $2, $3, $4);
          `;
          
          await client.query(stockQuery, [
            id_producto,
            id,
            talla.id_talla,
            talla.cantidad
          ]);
        }
      }
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Producto y variante actualizados correctamente'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar variante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  } finally {
    client.release();
  }
};

// Función para eliminar imagen de Cloudinary
const deleteImageFromCloudinary = async (req, res) => {
  try {
    const { public_id, variant_id } = req.body;
    
    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'public_id es requerido'
      });
    }

    // Eliminar imagen de Cloudinary
    const result = await deleteImage(public_id);
    
    // Si se proporciona variant_id, también eliminar de la base de datos
    if (variant_id) {
      await pool.query(
        'DELETE FROM imagenes_variante WHERE public_id = $1 AND id_variante = $2',
        [public_id, variant_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Imagen eliminada correctamente',
      result: result
    });
    
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen'
    });
  }
};

module.exports = {
  getAllVariants,
  getAllProducts,
  getSizeSystems,
  createProductWithVariant,
  createVariantForProduct,
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
  deleteProduct,
  getProductById,
  updateProduct,
  deleteVariant,
  getVariantById,
  updateVariant
};
