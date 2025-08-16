// controllers/cart.controller.js
const pool = require('../config/db');

// Obtener carrito activo del usuario (o crear uno nuevo si no existe)
const getActiveCart = async (req, res) => {
  try {
    // Manejar usuarios no autenticados temporalmente
    if (!req.user || !req.user.id_usuario) {
      return res.json({
        success: true,
        cart: {
          id_pedido: null,
          fecha_creacion: null,
          total: 0,
          items: []
        },
        message: 'Carrito vacío - usuario no autenticado'
      });
    }

    const { id_usuario } = req.user; // Del middleware de autenticación
    
    // Buscar carrito activo (pedido con estado 'carrito')
    let cartQuery = `
      SELECT p.id_pedido, p.fecha_creacion, p.total,
             pd.id_detalle, pd.id_producto, pd.id_variante, pd.id_talla, 
             pd.cantidad, pd.precio_unitario,
             pr.nombre as nombre_producto, COALESCE(c.nombre, 'Sin categoría') as categoria, pr.marca,
             v.nombre as nombre_variante, 
             iv.url as imagen_url,
             t.id_talla, t.nombre_talla
      FROM pedidos p
      LEFT JOIN pedido_detalle pd ON p.id_pedido = pd.id_pedido
      LEFT JOIN productos pr ON pd.id_producto = pr.id_producto
      LEFT JOIN categorias c ON pr.id_categoria = c.id_categoria
      LEFT JOIN variantes v ON pd.id_variante = v.id_variante  
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante AND iv.orden = 1
      LEFT JOIN tallas t ON pd.id_talla = t.id_talla
      WHERE p.id_usuario = $1 AND p.estado = 'carrito'
      ORDER BY pd.id_detalle ASC
    `;
    
    const cartResult = await pool.query(cartQuery, [id_usuario]);
    
    if (cartResult.rows.length === 0) {
      // No hay carrito activo, crear uno nuevo
      const newCartQuery = `
        INSERT INTO pedidos (id_usuario, estado, total, fecha_creacion)
        VALUES ($1, 'carrito', 0.00, NOW())
        RETURNING id_pedido, fecha_creacion, total
      `;
      
      const newCart = await pool.query(newCartQuery, [id_usuario]);
      
      return res.json({
        success: true,
        cart: {
          id_pedido: newCart.rows[0].id_pedido,
          fecha_creacion: newCart.rows[0].fecha_creacion,
          total: 0,
          items: []
        }
      });
    }
    
    // Formatear items del carrito
    const items = cartResult.rows
      .filter(row => row.id_detalle !== null) // Filtrar items nulos
      .map(row => ({
        id_detalle: row.id_detalle,
        id_producto: row.id_producto,
        id_variante: row.id_variante,
        id_talla: row.id_talla,
        nombre_producto: row.nombre_producto,
        nombre_variante: row.nombre_variante,
        nombre_talla: row.nombre_talla,
        imagen_url: row.imagen_url,
        precio: parseFloat(row.precio_unitario),
        cantidad: row.cantidad,
        categoria: row.categoria,
        marca: row.marca
      }));
    
    res.json({
      success: true,
      cart: {
        id_pedido: cartResult.rows[0].id_pedido,
        fecha_creacion: cartResult.rows[0].fecha_creacion,
        total: parseFloat(cartResult.rows[0].total || 0),
        items: items
      }
    });
    
  } catch (error) {
    console.error('Error getting active cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el carrito'
    });
  }
};

// Agregar item al carrito
const addToCart = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { id_producto, id_variante, id_talla, cantidad, precio_unitario } = req.body;
    
    // Validar datos requeridos
    if (!id_producto || !id_variante || !id_talla || !cantidad || !precio_unitario) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }
    
    // Obtener o crear carrito activo
    let cartQuery = `
      SELECT id_pedido FROM pedidos 
      WHERE id_usuario = $1 AND estado = 'carrito'
      ORDER BY fecha_creacion DESC
      LIMIT 1
    `;
    
    let cartResult = await pool.query(cartQuery, [id_usuario]);
    let id_pedido;
    
    if (cartResult.rows.length === 0) {
      // Crear nuevo carrito
      const newCartQuery = `
        INSERT INTO pedidos (id_usuario, estado, total, fecha_creacion)
        VALUES ($1, 'carrito', 0.00, NOW())
        RETURNING id_pedido
      `;
      const newCart = await pool.query(newCartQuery, [id_usuario]);
      id_pedido = newCart.rows[0].id_pedido;
    } else {
      id_pedido = cartResult.rows[0].id_pedido;
    }
    
    // Verificar si el item ya existe en el carrito
    const existingItemQuery = `
      SELECT id_detalle, cantidad 
      FROM pedido_detalle 
      WHERE id_pedido = $1 AND id_variante = $2 AND id_talla = $3
    `;
    
    const existingItem = await pool.query(existingItemQuery, [id_pedido, id_variante, id_talla]);
    
    if (existingItem.rows.length > 0) {
      // Actualizar cantidad existente
      const newQuantity = existingItem.rows[0].cantidad + cantidad;
      const updateQuery = `
        UPDATE pedido_detalle 
        SET cantidad = $1, precio_unitario = $2
        WHERE id_detalle = $3
        RETURNING *
      `;
      
      await pool.query(updateQuery, [newQuantity, precio_unitario, existingItem.rows[0].id_detalle]);
    } else {
      // Agregar nuevo item
      const insertQuery = `
        INSERT INTO pedido_detalle (id_pedido, id_producto, id_variante, id_talla, cantidad, precio_unitario)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      await pool.query(insertQuery, [id_pedido, id_producto, id_variante, id_talla, cantidad, precio_unitario]);
    }
    
    // Recalcular total del carrito
    await updateCartTotal(id_pedido);
    
    res.json({
      success: true,
      message: 'Producto agregado al carrito'
    });
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar producto al carrito'
    });
  }
};

// Actualizar cantidad de un item
const updateCartItem = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { id_detalle, cantidad } = req.body;
    
    if (!id_detalle || cantidad < 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos'
      });
    }
    
    // Verificar que el item pertenece al usuario
    const verifyQuery = `
      SELECT pd.id_detalle, p.id_pedido
      FROM pedido_detalle pd
      JOIN pedidos p ON pd.id_pedido = p.id_pedido
      WHERE pd.id_detalle = $1 AND p.id_usuario = $2 AND p.estado = 'carrito'
    `;
    
    const verifyResult = await pool.query(verifyQuery, [id_detalle, id_usuario]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }
    
    const id_pedido = verifyResult.rows[0].id_pedido;
    
    if (cantidad === 0) {
      // Eliminar item si cantidad es 0
      await pool.query('DELETE FROM pedido_detalle WHERE id_detalle = $1', [id_detalle]);
    } else {
      // Actualizar cantidad
      await pool.query(
        'UPDATE pedido_detalle SET cantidad = $1 WHERE id_detalle = $2',
        [cantidad, id_detalle]
      );
    }
    
    // Recalcular total
    await updateCartTotal(id_pedido);
    
    res.json({
      success: true,
      message: 'Carrito actualizado'
    });
    
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el carrito'
    });
  }
};

// Eliminar item del carrito
const removeFromCart = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    const { id_detalle } = req.params;
    
    // Verificar que el item pertenece al usuario
    const verifyQuery = `
      SELECT pd.id_detalle, p.id_pedido
      FROM pedido_detalle pd
      JOIN pedidos p ON pd.id_pedido = p.id_pedido
      WHERE pd.id_detalle = $1 AND p.id_usuario = $2 AND p.estado = 'carrito'
    `;
    
    const verifyResult = await pool.query(verifyQuery, [id_detalle, id_usuario]);
    
    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }
    
    const id_pedido = verifyResult.rows[0].id_pedido;
    
    // Eliminar item
    await pool.query('DELETE FROM pedido_detalle WHERE id_detalle = $1', [id_detalle]);
    
    // Recalcular total
    await updateCartTotal(id_pedido);
    
    res.json({
      success: true,
      message: 'Producto eliminado del carrito'
    });
    
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto del carrito'
    });
  }
};

// Limpiar carrito
const clearCart = async (req, res) => {
  try {
    const { id_usuario } = req.user;
    
    // Obtener carrito activo
    const cartQuery = `
      SELECT id_pedido FROM pedidos 
      WHERE id_usuario = $1 AND estado = 'carrito'
    `;
    
    const cartResult = await pool.query(cartQuery, [id_usuario]);
    
    if (cartResult.rows.length > 0) {
      const id_pedido = cartResult.rows[0].id_pedido;
      
      // Eliminar todos los items
      await pool.query('DELETE FROM pedido_detalle WHERE id_pedido = $1', [id_pedido]);
      
      // Actualizar total a 0
      await pool.query('UPDATE pedidos SET total = 0.00 WHERE id_pedido = $1', [id_pedido]);
    }
    
    res.json({
      success: true,
      message: 'Carrito limpiado'
    });
    
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar el carrito'
    });
  }
};

// Función auxiliar para recalcular el total del carrito
const updateCartTotal = async (id_pedido) => {
  try {
    const totalQuery = `
      SELECT COALESCE(SUM(cantidad * precio_unitario), 0) as total
      FROM pedido_detalle 
      WHERE id_pedido = $1
    `;
    
    const totalResult = await pool.query(totalQuery, [id_pedido]);
    const total = totalResult.rows[0].total;
    
    await pool.query(
      'UPDATE pedidos SET total = $1 WHERE id_pedido = $2',
      [total, id_pedido]
    );
    
  } catch (error) {
    console.error('Error updating cart total:', error);
  }
};

module.exports = {
  getActiveCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
