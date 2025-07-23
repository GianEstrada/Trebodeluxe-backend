const pool = require('../config/db');

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

      // Agregar imagen si existe
      if (variante.imagen_url && variante.imagen_public_id) {
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

    // Agregar imagen si existe
    if (imagen_url && imagen_public_id) {
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
  const { uploadImage, cleanupTempFile } = require('../config/cloudinary');
  
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

module.exports = {
  getAllVariants,
  getAllProducts,
  getSizeSystems,
  createProductWithVariant,
  createVariantForProduct,
  uploadImageToCloudinary
};
