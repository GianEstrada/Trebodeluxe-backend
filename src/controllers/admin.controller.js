const { pool } = require('../config/db');
const { uploadImage, deleteImage, cleanupTempFile } = require('../config/cloudinary');

// Obtener todas las variantes con información completa
const getAllVariants = async (req, res) => {
  try {
    const query = `
      SELECT 
        v.id_variante,
        v.nombre as nombre_variante,
        MIN(s.precio) as precio_minimo,
        MAX(s.precio) as precio_maximo,
        COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
        CASE 
          WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
          ELSE false
        END as precio_unico,
        v.activo as variante_activa,
        p.id_producto,
        p.nombre as nombre_producto,
        p.descripcion as descripcion_producto,
        COALESCE(c.nombre, 'Sin categoría') as categoria,
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
                'cantidad', COALESCE(s.cantidad, 0),
                'precio', s.precio,
                'orden', t.orden
              )
            END ORDER BY t.orden
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
               p.id_producto, p.nombre, p.descripcion, c.nombre, p.marca,
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
        COALESCE(c.nombre, 'Sin categoría') as categoria,
        st.id_sistema_talla,
        st.nombre as sistema_talla
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
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

    // Convertir categoría a ID si es string
    let id_categoria = categoria;
    if (typeof categoria === 'string') {
      // Buscar la categoría por nombre
      const catResult = await client.query(
        'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)',
        [categoria]
      );
      
      if (catResult.rows.length > 0) {
        id_categoria = catResult.rows[0].id_categoria;
      } else {
        // Si no existe, crear nueva categoría
        const newCatResult = await client.query(
          'INSERT INTO categorias (nombre, activo) VALUES ($1, true) RETURNING id_categoria',
          [categoria]
        );
        id_categoria = newCatResult.rows[0].id_categoria;
      }
    }

    // Crear producto
    const productQuery = `
      INSERT INTO productos (nombre, descripcion, id_categoria, marca, id_sistema_talla)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_producto;
    `;
    
    const productResult = await client.query(productQuery, [
      producto_nombre, 
      producto_descripcion, 
      id_categoria, 
      marca, 
      id_sistema_talla
    ]);
    
    const id_producto = productResult.rows[0].id_producto;

    // Crear variantes
    for (const variante of variantes) {
      // Crear variante (sin precios, van en stock)
      const variantQuery = `
        INSERT INTO variantes (id_producto, nombre)
        VALUES ($1, $2)
        RETURNING id_variante;
      `;
      
      const variantResult = await client.query(variantQuery, [
        id_producto,
        variante.nombre
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

      // Agregar stock por tallas con precio
      if (variante.tallas && variante.tallas.length > 0) {
        for (const talla of variante.tallas) {
          if (talla.cantidad > 0) {
            const stockQuery = `
              INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
              VALUES ($1, $2, $3, $4, $5);
            `;
            
            await client.query(stockQuery, [
              id_producto,
              id_variante,
              talla.id_talla,
              talla.cantidad,
              variante.precio || null
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

    // Crear variante (sin precios, van en stock)
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

    // Agregar stock por tallas con precios
    if (tallas && tallas.length > 0) {
      for (const talla of tallas) {
        if (talla.cantidad > 0) {
          const stockQuery = `
            INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
            VALUES ($1, $2, $3, $4, $5);
          `;
          
          await client.query(stockQuery, [
            id_producto,
            id_variante,
            talla.id_talla,
            talla.cantidad,
            precio || null
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
            'precio', COALESCE(MIN(stock_precios.precio), NULL),
            'activo', v.activo,
            'imagenes', COALESCE(imagenes.imagenes, '[]'::json),
            'tallas', COALESCE(tallas.tallas, '[]'::json)
          )
        ) as variantes
      FROM productos p
      LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
      LEFT JOIN variantes v ON p.id_producto = v.id_producto AND v.activo = true
      LEFT JOIN (
        SELECT id_variante, precio
        FROM stock
        WHERE precio IS NOT NULL
      ) stock_precios ON v.id_variante = stock_precios.id_variante
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
              'cantidad', s.cantidad,
              'precio', s.precio
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
      SET nombre = $1, descripcion = $2, id_categoria = $3, marca = $4, id_sistema_talla = $5
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
        v.activo,
        v.id_producto,
        p.nombre as nombre_producto,
        p.descripcion as descripcion_producto,
        p.categoria,
        p.marca,
        p.id_sistema_talla,
        st.nombre as sistema_talla,
        COALESCE(img.imagenes, '[]'::json) as imagenes,
        COALESCE(stock_info.tallas_stock, '[]'::json) as tallas_stock,
        precios_info.precio_minimo,
        precios_info.precio_maximo,
        precios_info.precios_distintos,
        precios_info.precio_unico
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
      WHERE v.id_variante = $1 AND v.activo = true AND p.activo = true
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
      precio_unico,
      precio_original,
      imagenes,
      tallas
    } = req.body;

    console.log('🔧 [BACKEND] updateVariant recibido para ID:', id);
    console.log('📦 [BACKEND] Datos recibidos:', req.body);
    console.log('💰 [BACKEND] precio_unico:', precio_unico, 'precio:', precio);
    
    // Usar nombre_variante si existe, sino usar nombre para compatibilidad
    const variantName = nombre_variante || nombre;
    
    // Si se proporcionan datos del producto, actualizarlos
    if (id_producto && (nombre_producto || categoria || descripcion_producto || marca)) {
      const productUpdateQuery = `
        UPDATE productos 
        SET 
          nombre = COALESCE($1, nombre),
          id_categoria = COALESCE($2, id_categoria),
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
    
    // Actualizar variante (solo nombre, los precios van en stock)
    const updateQuery = `
      UPDATE variantes 
      SET nombre = $1
      WHERE id_variante = $2 AND activo = true
      RETURNING id_variante;
    `;
    
    const result = await client.query(updateQuery, [
      variantName, id
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
      // Obtener id_producto para el stock
      const productQuery = 'SELECT id_producto FROM variantes WHERE id_variante = $1';
      const productResult = await client.query(productQuery, [id]);
      const id_producto = productResult.rows[0].id_producto;
      
      console.log('📊 [BACKEND] Procesando tallas. Cantidad:', tallas.length);
      console.log('📊 [BACKEND] Tallas recibidas:', tallas);
      
      // Si precio_unico es true, usar el precio general para todas las tallas
      if (precio_unico === true && precio !== undefined) {
        console.log('🔥 [BACKEND] Aplicando PRECIO ÚNICO:', precio);
        // Aplicar precio único a todas las tallas de la variante
        for (const talla of tallas) {
          // Verificar si ya existe stock para esta talla
          const existingStockQuery = `
            SELECT id_stock FROM stock 
            WHERE id_variante = $1 AND id_talla = $2
          `;
          const existingStock = await client.query(existingStockQuery, [id, talla.id_talla]);
          
          if (existingStock.rows.length > 0) {
            // Actualizar stock existente con precio único
            const updateStockQuery = `
              UPDATE stock 
              SET cantidad = $1, precio = $2
              WHERE id_variante = $3 AND id_talla = $4;
            `;
            
            await client.query(updateStockQuery, [
              talla.cantidad,
              precio, // Usar precio único para todas las tallas
              id,
              talla.id_talla
            ]);
          } else if (talla.cantidad > 0) {
            // Crear nuevo stock solo si la cantidad es mayor a 0
            const stockQuery = `
              INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
              VALUES ($1, $2, $3, $4, $5);
            `;
            
            await client.query(stockQuery, [
              id_producto,
              id,
              talla.id_talla,
              talla.cantidad,
              precio // Usar precio único para todas las tallas
            ]);
          } else {
            // Si la cantidad es 0, eliminar el stock si existe
            await client.query('DELETE FROM stock WHERE id_variante = $1 AND id_talla = $2', [id, talla.id_talla]);
          }
        }
      } else {
        console.log('🎯 [BACKEND] Aplicando PRECIOS DIFERENCIADOS por talla');
        // Procesar cada talla individualmente con precios diferenciados
        for (const talla of tallas) {
          // Verificar si ya existe stock para esta talla
          const existingStockQuery = `
            SELECT id_stock FROM stock 
            WHERE id_variante = $1 AND id_talla = $2
          `;
          const existingStock = await client.query(existingStockQuery, [id, talla.id_talla]);
          
          // Determinar el precio a usar: precio específico de la talla o precio general
          const precioFinal = talla.precio !== undefined ? talla.precio : precio;
          
          console.log(`💰 [BACKEND] Talla ${talla.id_talla} (${talla.nombre_talla || 'N/A'}): cantidad=${talla.cantidad}, precio_talla=${talla.precio}, precio_final=${precioFinal}`);
          
          if (existingStock.rows.length > 0) {
            // Actualizar stock existente
            const updateStockQuery = `
              UPDATE stock 
              SET cantidad = $1, precio = $2
              WHERE id_variante = $3 AND id_talla = $4;
            `;
            
            await client.query(updateStockQuery, [
              talla.cantidad,
              precioFinal,
              id,
              talla.id_talla
            ]);
            
            console.log(`✅ [BACKEND] Actualizada talla ${talla.id_talla}: cantidad=${talla.cantidad}, precio=${precioFinal}`);
          } else if (talla.cantidad > 0) {
            // Crear nuevo stock solo si la cantidad es mayor a 0
            const stockQuery = `
              INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
              VALUES ($1, $2, $3, $4, $5);
            `;
            
            await client.query(stockQuery, [
              id_producto,
              id,
              talla.id_talla,
              talla.cantidad,
              precioFinal
            ]);
            
            console.log(`✅ [BACKEND] Creada talla ${talla.id_talla}: cantidad=${talla.cantidad}, precio=${precioFinal}`);
          } else {
            // Si la cantidad es 0, eliminar el stock si existe
            await client.query('DELETE FROM stock WHERE id_variante = $1 AND id_talla = $2', [id, talla.id_talla]);
            console.log(`🗑️ [BACKEND] Eliminada talla ${talla.id_talla} (cantidad 0)`);
          }
        }
      }
    } else if (precio_unico === true && precio !== undefined) {
      // Si se envía precio_unico sin tallas específicas, aplicar a todas las tallas existentes
      const updateAllPricesQuery = `
        UPDATE stock 
        SET precio = $1
        WHERE id_variante = $2;
      `;
      
      await client.query(updateAllPricesQuery, [
        precio, id
      ]);
    } else if (precio !== undefined) {
      // Si no se proporcionan tallas pero sí precio, actualizar todo el stock existente
      const updateStockPriceQuery = `
        UPDATE stock 
        SET precio = $1
        WHERE id_variante = $2;
      `;
      
      await client.query(updateStockPriceQuery, [
        precio, id
      ]);
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

// Obtener imágenes principales del sitio
const getHomeImages = async (req, res) => {
  try {
    const query = `
      SELECT setting_key, setting_value, public_id 
      FROM site_settings 
      WHERE setting_key IN ('heroImage1', 'heroImage2', 'promosBannerImage')
    `;
    
    const result = await pool.query(query);
    
    // Crear objeto con las imágenes
    const images = {
      heroImage1: '/797e7904b64e13508ab322be3107e368-1@2x.png',
      heroImage2: '/look-polo-2-1@2x.png',
      promosBannerImage: '/promociones-playa.jpg'
    };
    
    // Actualizar con los valores de la base de datos
    result.rows.forEach(row => {
      images[row.setting_key] = row.setting_value;
    });
    
    res.json({
      success: true,
      images
    });
    
  } catch (error) {
    console.error('Error al obtener imágenes principales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las imágenes principales'
    });
  }
};

// Actualizar imagen principal del sitio
const updateHomeImage = async (req, res) => {
  try {
    const { imageType, url, public_id } = req.body;
    
    if (!imageType || !url) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de imagen y URL son requeridos'
      });
    }
    
    // Verificar que el tipo de imagen sea válido
    const validTypes = ['heroImage1', 'heroImage2', 'promosBannerImage'];
    if (!validTypes.includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de imagen no válido'
      });
    }
    
    // Actualizar o insertar la configuración
    const query = `
      INSERT INTO site_settings (setting_key, setting_value, public_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        public_id = EXCLUDED.public_id,
        updated_at = NOW()
    `;
    
    await pool.query(query, [imageType, url, public_id]);
    
    res.json({
      success: true,
      message: 'Imagen actualizada correctamente'
    });
    
  } catch (error) {
    console.error('Error al actualizar imagen principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la imagen principal'
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
  updateVariant,
  getHomeImages,
  updateHomeImage
};

// ================== FUNCIONES PARA IMÁGENES INDEX ==================

// Obtener todas las imágenes index
const getIndexImages = async (req, res) => {
  try {
    const { search, seccion } = req.query;
    
    let query = `
      SELECT 
        id_imagen,
        nombre,
        descripcion,
        url,
        public_id,
        seccion,
        estado,
        fecha_creacion,
        fecha_actualizacion
      FROM imagenes_index
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Filtrar por sección si se proporciona
    if (seccion && ['principal', 'banner'].includes(seccion)) {
      whereConditions.push(`seccion = $${queryParams.length + 1}`);
      queryParams.push(seccion);
    }
    
    // Agregar filtro de búsqueda si se proporciona
    if (search && search.trim()) {
      whereConditions.push(`(nombre ILIKE $${queryParams.length + 1} OR descripcion ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search.trim()}%`);
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY 
      seccion ASC,
      CASE estado 
        WHEN 'izquierda' THEN 1 
        WHEN 'derecha' THEN 2 
        WHEN 'activo' THEN 1
        WHEN 'inactivo' THEN 3 
      END,
      fecha_creacion DESC
    `;
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      images: result.rows
    });
    
  } catch (error) {
    console.error('Error al obtener imágenes index:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las imágenes index'
    });
  }
};

// Crear nueva imagen index
const createIndexImage = async (req, res) => {
  try {
    const { nombre, descripcion, url, public_id, seccion, estado = 'inactivo' } = req.body;
    
    if (!nombre || !url || !public_id || !seccion) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, URL, public_id y sección son requeridos'
      });
    }
    
    // Validar sección
    const validSections = ['principal', 'banner'];
    if (!validSections.includes(seccion)) {
      return res.status(400).json({
        success: false,
        message: 'Sección no válida. Debe ser "principal" o "banner"'
      });
    }
    
    // Validar estado según la sección
    let validStates;
    if (seccion === 'principal') {
      validStates = ['inactivo', 'izquierda', 'derecha'];
    } else {
      validStates = ['activo', 'inactivo'];
    }
    
    if (!validStates.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado no válido para la sección ${seccion}. Valores permitidos: ${validStates.join(', ')}`
      });
    }
    
    // Verificar restricciones de estado único
    await enforceUniqueState(seccion, estado);
    
    const query = `
      INSERT INTO imagenes_index (nombre, descripcion, url, public_id, seccion, estado)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [nombre, descripcion, url, public_id, seccion, estado]);
    
    res.json({
      success: true,
      message: 'Imagen index creada correctamente',
      image: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al crear imagen index:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al crear la imagen index'
    });
  }
};

// Función auxiliar para enforcer estados únicos
const enforceUniqueState = async (seccion, estado) => {
  if (seccion === 'principal' && (estado === 'izquierda' || estado === 'derecha')) {
    // Solo puede haber una imagen izquierda y una derecha
    await pool.query(
      'UPDATE imagenes_index SET estado = $1 WHERE seccion = $2 AND estado = $3',
      ['inactivo', 'principal', estado]
    );
  } else if (seccion === 'banner' && estado === 'activo') {
    // Solo puede haber una imagen activa en banner
    await pool.query(
      'UPDATE imagenes_index SET estado = $1 WHERE seccion = $2 AND estado = $3',
      ['inactivo', 'banner', 'activo']
    );
  }
};

// Actualizar imagen index
const updateIndexImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'Nombre es requerido'
      });
    }
    
    const query = `
      UPDATE imagenes_index 
      SET nombre = $1, descripcion = $2, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_imagen = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [nombre, descripcion, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Imagen index actualizada correctamente',
      image: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al actualizar imagen index:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la imagen index'
    });
  }
};

// Eliminar imagen index
const deleteIndexImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero obtener los datos de la imagen para eliminar de Cloudinary
    const selectQuery = `
      SELECT public_id FROM imagenes_index WHERE id_imagen = $1
    `;
    const selectResult = await pool.query(selectQuery, [id]);
    
    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }
    
    const { public_id } = selectResult.rows[0];
    
    // Eliminar de la base de datos
    const deleteQuery = `
      DELETE FROM imagenes_index WHERE id_imagen = $1
      RETURNING *
    `;
    const deleteResult = await pool.query(deleteQuery, [id]);
    
    // Eliminar de Cloudinary
    try {
      if (public_id) {
        await deleteImage(public_id);
      }
    } catch (cloudinaryError) {
      console.warn('Error al eliminar imagen de Cloudinary:', cloudinaryError);
      // No fallar la operación si Cloudinary falla
    }
    
    res.json({
      success: true,
      message: 'Imagen index eliminada correctamente',
      image: deleteResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error al eliminar imagen index:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen index'
    });
  }
};

// Actualizar estado de imagen index
const updateImageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Primero obtener la imagen para validar la sección
    const selectQuery = 'SELECT seccion FROM imagenes_index WHERE id_imagen = $1';
    const selectResult = await pool.query(selectQuery, [id]);
    
    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Imagen no encontrada'
      });
    }
    
    const { seccion } = selectResult.rows[0];
    
    // Validar estado según la sección
    let validStates;
    if (seccion === 'principal') {
      validStates = ['inactivo', 'izquierda', 'derecha'];
    } else {
      validStates = ['activo', 'inactivo'];
    }
    
    if (!validStates.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado no válido para la sección ${seccion}. Valores permitidos: ${validStates.join(', ')}`
      });
    }
    
    // Verificar restricciones de estado único antes de actualizar
    await enforceUniqueState(seccion, estado);
    
    const updateQuery = `
      UPDATE imagenes_index 
      SET estado = $1, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id_imagen = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [estado, id]);
    
    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
      image: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado'
    });
  }
};

// Actualizar posición de imagen (mantenida para compatibilidad)
const updateImagePosition = async (req, res) => {
  // Redirigir a updateImageStatus para mantener compatibilidad
  return updateImageStatus(req, res);
};

// Exportar las nuevas funciones junto con las existentes
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
  updateVariant,
  getHomeImages,
  updateHomeImage,
  // Funciones para imágenes index
  getIndexImages,
  createIndexImage,
  updateIndexImage,
  deleteIndexImage,
  updateImageStatus,
  updateImagePosition
};
