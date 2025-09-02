const database = require('../config/db');
const { uploadImage, deleteImage } = require('../config/cloudinary');

const AdminVariantController = {
  // Obtener todas las variantes para admin
  async getVariants(req, res) {
    try {
      const { search } = req.query;
      
      let query = `
        SELECT 
          v.id_variante,
          v.nombre AS nombre_variante,
          v.activo AS variante_activa,
          p.id_producto,
          p.nombre AS nombre_producto,
          p.descripcion AS descripcion_producto,
          c.nombre AS categoria,
          p.marca,
          st.nombre AS sistema_talla,
          st.id_sistema_talla,
          
          -- Obtener el precio mínimo como precio de referencia
          COALESCE(MIN(s.precio), 0) AS precio,
          
          -- Verificar si tiene precios únicos
          CASE 
            WHEN COUNT(DISTINCT s.precio) <= 1 THEN true 
            ELSE false 
          END AS precio_unico,
          
          -- Imagen principal
          iv.url AS imagen_url,
          iv.public_id AS imagen_public_id,
          
          -- Imágenes adicionales
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id_imagen', iv2.id_imagen,
              'url', iv2.url,
              'public_id', iv2.public_id,
              'orden', iv2.orden
            ) ORDER BY iv2.orden
          ) FILTER (WHERE iv2.id_imagen IS NOT NULL) AS imagenes,
          
          -- Stock por tallas
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'cantidad', COALESCE(s.cantidad, 0),
              'precio', COALESCE(s.precio, 0)
            ) ORDER BY t.orden
          ) FILTER (WHERE t.id_talla IS NOT NULL) AS tallas_stock
          
        FROM variantes v
        JOIN productos p ON v.id_producto = p.id_producto
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN stock s ON v.id_variante = s.id_variante
        LEFT JOIN tallas t ON s.id_talla = t.id_talla
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
        LEFT JOIN imagenes_variante iv2 ON v.id_variante = iv2.id_variante
      `;
      
      let queryParams = [];
      
      if (search) {
        query += ` WHERE (
          LOWER(p.nombre) LIKE LOWER($1) OR 
          LOWER(v.nombre) LIKE LOWER($1) OR 
          LOWER(c.nombre) LIKE LOWER($1) OR 
          LOWER(p.marca) LIKE LOWER($1)
        )`;
        queryParams.push(`%${search}%`);
      }
      
      query += ` 
        GROUP BY 
          v.id_variante, v.nombre, v.activo,
          p.id_producto, p.nombre, p.descripcion, 
          c.nombre, p.marca,
          st.nombre, st.id_sistema_talla,
          iv.url, iv.public_id
        ORDER BY p.fecha_creacion DESC, v.id_variante DESC
      `;
      
      const result = await database.query(query, queryParams);
      
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
  },

  // Obtener variante específica para edición
  async getVariant(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          v.id_variante,
          v.nombre AS nombre_variante,
          v.activo AS variante_activa,
          p.id_producto,
          p.nombre AS nombre_producto,
          p.descripcion AS descripcion_producto,
          c.id_categoria,
          c.nombre AS categoria,
          p.marca,
          st.nombre AS sistema_talla,
          st.id_sistema_talla,
          
          -- Verificar si tiene precios únicos
          CASE 
            WHEN COUNT(DISTINCT s.precio) <= 1 THEN true 
            ELSE false 
          END AS precio_unico,
          
          -- Precio de referencia (el primero)
          MIN(s.precio) AS precio_referencia,
          
          -- Imágenes
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id_imagen', iv.id_imagen,
              'url', iv.url,
              'public_id', iv.public_id,
              'orden', iv.orden
            ) ORDER BY iv.orden
          ) FILTER (WHERE iv.id_imagen IS NOT NULL) AS imagenes,
          
          -- Stock por tallas con precios
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'cantidad', COALESCE(s.cantidad, 0),
              'precio', COALESCE(s.precio, 0)
            ) ORDER BY t.orden
          ) FILTER (WHERE t.id_talla IS NOT NULL) AS tallas
          
        FROM variantes v
        JOIN productos p ON v.id_producto = p.id_producto
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
        LEFT JOIN sistemas_talla st ON p.id_sistema_talla = st.id_sistema_talla
        LEFT JOIN stock s ON v.id_variante = s.id_variante
        LEFT JOIN tallas t ON s.id_talla = t.id_talla
        LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
        WHERE v.id_variante = $1
        GROUP BY 
          v.id_variante, v.nombre, v.activo,
          p.id_producto, p.nombre, p.descripcion, 
          c.id_categoria, c.nombre, p.marca,
          st.nombre, st.id_sistema_talla
      `;
      
      const result = await database.query(query, [id]);
      
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
  },

  // Crear nueva variante
  async createVariant(req, res) {
    const client = await database.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        // Datos del producto
        id_producto,
        nombre_producto,
        categoria,
        descripcion_producto,
        marca,
        id_sistema_talla,
        // Datos de la variante
        nombre_variante,
        imagenes,
        tallas,
        // Configuración de precio
        precio_unico,
        precio_referencia
      } = req.body;
      
      console.log('🔍 [BACKEND DEBUG] Datos recibidos:', {
        id_producto,
        nombre_variante,
        precio_unico,
        precio_referencia,
        tallas: tallas?.map(t => ({ id_talla: t.id_talla, cantidad: t.cantidad, precio: t.precio }))
      });
      
      // Validaciones
      if (!nombre_variante || (!precio_unico && (!tallas || tallas.length === 0))) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos'
        });
      }
      
      let productoId = id_producto;
      
      // Si no hay id_producto, crear nuevo producto
      if (!productoId) {
        if (!nombre_producto || !categoria) {
          return res.status(400).json({
            success: false,
            message: 'Para crear un nuevo producto se requiere nombre y categoría'
          });
        }
        
        // Buscar o crear categoría
        let categoriaId;
        if (typeof categoria === 'string') {
          // Buscar categoría existente
          const catResult = await client.query(
            'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)',
            [categoria]
          );
          
          if (catResult.rows.length > 0) {
            categoriaId = catResult.rows[0].id_categoria;
          } else {
            // Crear nueva categoría
            const newCatResult = await client.query(
              'INSERT INTO categorias (nombre, activo) VALUES ($1, true) RETURNING id_categoria',
              [categoria]
            );
            categoriaId = newCatResult.rows[0].id_categoria;
          }
        } else {
          categoriaId = categoria; // Es un ID
        }
        
        const productResult = await client.query(
          `INSERT INTO productos (nombre, descripcion, id_categoria, marca, id_sistema_talla)
           VALUES ($1, $2, $3, $4, $5) RETURNING id_producto`,
          [nombre_producto, descripcion_producto, categoriaId, marca, id_sistema_talla]
        );
        
        productoId = productResult.rows[0].id_producto;
      }
      
      // Crear variante
      const variantResult = await client.query(
        `INSERT INTO variantes (id_producto, nombre, activo)
         VALUES ($1, $2, true) RETURNING id_variante`,
        [productoId, nombre_variante]
      );
      
      const varianteId = variantResult.rows[0].id_variante;
      
      // Crear stock con precios
      if (tallas && tallas.length > 0) {
        for (const talla of tallas) {
          let precio;
          if (precio_unico) {
            // Para precio único, usar precio_referencia, sino usar 0 como fallback
            precio = precio_referencia && precio_referencia > 0 ? precio_referencia : 0;
          } else {
            // Para precios individuales, usar precio de talla, sino usar 0 como fallback
            precio = talla.precio && talla.precio > 0 ? talla.precio : 0;
          }
          
          console.log(`📊 [BACKEND] Insertando stock - Talla: ${talla.id_talla}, Cantidad: ${talla.cantidad || 0}, Precio: ${precio}`);
          
          await client.query(
            `INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id_producto, id_variante, id_talla) 
             DO UPDATE SET cantidad = $4, precio = $5`,
            [productoId, varianteId, talla.id_talla, talla.cantidad || 0, precio]
          );
        }
      }
      
      // Guardar imágenes
      if (imagenes && imagenes.length > 0) {
        for (let i = 0; i < imagenes.length; i++) {
          const imagen = imagenes[i];
          await client.query(
            `INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
             VALUES ($1, $2, $3, $4)`,
            [varianteId, imagen.url, imagen.public_id, i + 1]
          );
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Variante creada exitosamente',
        variant_id: varianteId,
        product_id: productoId
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
  },

  // Actualizar variante existente
  async updateVariant(req, res) {
    const client = await database.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const {
        // Datos del producto
        id_producto,
        nombre_producto,
        categoria,
        descripcion_producto,
        marca,
        // Datos de la variante
        nombre_variante,
        imagenes,
        tallas,
        // Configuración de precio
        precio_unico,
        precio_referencia
      } = req.body;
      
      // Verificar que la variante existe
      const variantCheck = await client.query(
        'SELECT id_variante, id_producto FROM variantes WHERE id_variante = $1',
        [id]
      );
      
      if (variantCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
        });
      }
      
      const productoId = variantCheck.rows[0].id_producto;
      
      // Actualizar producto si se proporcionan datos
      if (nombre_producto || categoria || descripcion_producto || marca) {
        let categoriaId = categoria;
        
        // Si categoria es string, buscarla o crearla
        if (typeof categoria === 'string') {
          const catResult = await client.query(
            'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)',
            [categoria]
          );
          
          if (catResult.rows.length > 0) {
            categoriaId = catResult.rows[0].id_categoria;
          } else {
            const newCatResult = await client.query(
              'INSERT INTO categorias (nombre, activo) VALUES ($1, true) RETURNING id_categoria',
              [categoria]
            );
            categoriaId = newCatResult.rows[0].id_categoria;
          }
        }
        
        await client.query(
          `UPDATE productos 
           SET nombre = COALESCE($1, nombre),
               descripcion = COALESCE($2, descripcion),
               id_categoria = COALESCE($3, id_categoria),
               marca = COALESCE($4, marca)
           WHERE id_producto = $5`,
          [nombre_producto, descripcion_producto, categoriaId, marca, productoId]
        );
      }
      
      // Actualizar variante
      if (nombre_variante) {
        await client.query(
          'UPDATE variantes SET nombre = $1 WHERE id_variante = $2',
          [nombre_variante, id]
        );
      }
      
      // Actualizar stock y precios
      if (tallas && tallas.length > 0) {
        // Eliminar stock existente
        await client.query('DELETE FROM stock WHERE id_variante = $1', [id]);
        
        // Crear nuevo stock
        for (const talla of tallas) {
          const precio = precio_unico ? precio_referencia : (talla.precio || 0);
          
          await client.query(
            `INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
             VALUES ($1, $2, $3, $4, $5)`,
            [productoId, id, talla.id_talla, talla.cantidad || 0, precio]
          );
        }
      }
      
      // Actualizar imágenes
      if (imagenes !== undefined) {
        // Obtener imágenes existentes para eliminar de Cloudinary
        const existingImages = await client.query(
          'SELECT public_id FROM imagenes_variante WHERE id_variante = $1',
          [id]
        );
        
        // Eliminar imágenes existentes de la BD
        await client.query('DELETE FROM imagenes_variante WHERE id_variante = $1', [id]);
        
        // Eliminar de Cloudinary (en background, no bloquear la respuesta)
        if (existingImages.rows.length > 0) {
          setImmediate(() => {
            existingImages.rows.forEach(img => {
              if (img.public_id) {
                deleteImage(img.public_id).catch(err => 
                  console.error('Error eliminando imagen de Cloudinary:', err)
                );
              }
            });
          });
        }
        
        // Agregar nuevas imágenes
        if (imagenes.length > 0) {
          for (let i = 0; i < imagenes.length; i++) {
            const imagen = imagenes[i];
            await client.query(
              `INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
               VALUES ($1, $2, $3, $4)`,
              [id, imagen.url, imagen.public_id, i + 1]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Variante actualizada exitosamente'
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
  },

  // Eliminar variante
  async deleteVariant(req, res) {
    const client = await database.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      
      // Obtener datos de la variante antes de eliminar
      const variantData = await client.query(
        `SELECT v.id_variante, v.nombre, p.nombre as producto_nombre,
                iv.public_id
         FROM variantes v
         JOIN productos p ON v.id_producto = p.id_producto
         LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
         WHERE v.id_variante = $1`,
        [id]
      );
      
      if (variantData.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Variante no encontrada'
        });
      }
      
      const publicIds = variantData.rows
        .map(row => row.public_id)
        .filter(Boolean);
      
      // Eliminar registros de la BD (las foreign keys se encargan del resto)
      await client.query('DELETE FROM variantes WHERE id_variante = $1', [id]);
      
      await client.query('COMMIT');
      
      // Eliminar imágenes de Cloudinary (en background)
      if (publicIds.length > 0) {
        setImmediate(() => {
          publicIds.forEach(publicId => {
            deleteImage(publicId).catch(err => 
              console.error('Error eliminando imagen de Cloudinary:', err)
            );
          });
        });
      }
      
      res.json({
        success: true,
        message: 'Variante eliminada exitosamente'
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
  }
};

module.exports = AdminVariantController;
