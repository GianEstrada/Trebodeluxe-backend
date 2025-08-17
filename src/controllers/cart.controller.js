const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Generar token de sesión para usuarios invitados
const generateSessionToken = () => {
    return uuidv4();
};

// Obtener carrito activo (usuarios registrados o invitados)
const getActiveCart = async (req, res) => {
    try {
        const { sessionToken } = req.query;
        let cartQuery;
        let queryParams;

        if (req.user && req.user.id) {
            // Usuario registrado
            cartQuery = `
                SELECT p.*, pp.cantidad, pp.precio_unitario, pp.talla, pp.color, pp.precio_total,
                       pr.nombre AS producto_nombre, pr.precio, pr.categoria,
                       img.url AS imagen_url
                FROM pedidos p
                LEFT JOIN productos_pedidos pp ON p.id = pp.pedido_id
                LEFT JOIN productos pr ON pp.producto_id = pr.id
                LEFT JOIN product_images img ON pr.id = img.product_id AND img.is_main = true
                WHERE p.user_id = $1 AND p.estado = 'carrito'
                ORDER BY pp.id
            `;
            queryParams = [req.user.id];
        } else if (sessionToken) {
            // Usuario invitado
            cartQuery = `
                SELECT p.*, pp.cantidad, pp.precio_unitario, pp.talla, pp.color, pp.precio_total,
                       pr.nombre AS producto_nombre, pr.precio, pr.categoria,
                       img.url AS imagen_url
                FROM pedidos p
                LEFT JOIN productos_pedidos pp ON p.id = pp.pedido_id
                LEFT JOIN productos pr ON pp.producto_id = pr.id
                LEFT JOIN product_images img ON pr.id = img.product_id AND img.is_main = true
                WHERE p.token_sesion = $1 AND p.estado = 'carrito'
                ORDER BY pp.id
            `;
            queryParams = [sessionToken];
        } else {
            return res.status(400).json({
                success: false,
                error: 'Se requiere token de sesión o usuario registrado'
            });
        }

        const result = await pool.query(cartQuery, queryParams);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                cart: {
                    id: null,
                    items: [],
                    total: 0,
                    itemCount: 0
                }
            });
        }

        // Procesar items del carrito
        const cartInfo = result.rows[0];
        const items = result.rows
            .filter(row => row.cantidad !== null)
            .map(row => ({
                id: row.id,
                producto_id: row.producto_id,
                producto_nombre: row.producto_nombre,
                cantidad: row.cantidad,
                precio_unitario: row.precio_unitario,
                precio_total: row.precio_total,
                talla: row.talla,
                color: row.color,
                imagen_url: row.imagen_url
            }));

        const total = items.reduce((sum, item) => sum + parseFloat(item.precio_total || 0), 0);
        const itemCount = items.reduce((sum, item) => sum + parseInt(item.cantidad || 0), 0);

        res.json({
            success: true,
            cart: {
                id: cartInfo.id,
                sessionToken: cartInfo.token_sesion,
                items: items,
                total: parseFloat(total.toFixed(2)),
                itemCount: itemCount,
                fechaCreacion: cartInfo.fecha_creacion
            }
        });

    } catch (error) {
        console.error('Error obteniendo carrito activo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Crear carrito para usuario invitado
const createGuestCart = async (req, res) => {
    try {
        const sessionToken = generateSessionToken();

        const result = await pool.query(
            `INSERT INTO pedidos (token_sesion, estado, total, fecha_creacion) 
             VALUES ($1, 'carrito', 0, NOW()) RETURNING *`,
            [sessionToken]
        );

        res.json({
            success: true,
            message: 'Carrito creado exitosamente',
            cart: {
                id: result.rows[0].id,
                sessionToken: result.rows[0].token_sesion,
                items: [],
                total: 0,
                itemCount: 0
            }
        });

    } catch (error) {
        console.error('Error creando carrito invitado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Añadir producto al carrito
const addToCart = async (req, res) => {
    try {
        const { producto_id, cantidad, talla, color } = req.body;
        const { sessionToken } = req.query;

        if (!producto_id || !cantidad) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere producto_id y cantidad'
            });
        }

        // Verificar que el producto existe
        const productResult = await pool.query(
            'SELECT id, nombre, precio FROM productos WHERE id = $1',
            [producto_id]
        );

        if (productResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        const producto = productResult.rows[0];
        let pedidoId;

        if (req.user && req.user.id) {
            // Usuario registrado
            let cartResult = await pool.query(
                'SELECT id FROM pedidos WHERE user_id = $1 AND estado = $2',
                [req.user.id, 'carrito']
            );

            if (cartResult.rows.length === 0) {
                // Crear nuevo carrito para usuario registrado
                const newCartResult = await pool.query(
                    `INSERT INTO pedidos (user_id, estado, total, fecha_creacion) 
                     VALUES ($1, 'carrito', 0, NOW()) RETURNING id`,
                    [req.user.id]
                );
                pedidoId = newCartResult.rows[0].id;
            } else {
                pedidoId = cartResult.rows[0].id;
            }
        } else if (sessionToken) {
            // Usuario invitado
            let cartResult = await pool.query(
                'SELECT id FROM pedidos WHERE token_sesion = $1 AND estado = $2',
                [sessionToken, 'carrito']
            );

            if (cartResult.rows.length === 0) {
                // Crear nuevo carrito para invitado
                const newCartResult = await pool.query(
                    `INSERT INTO pedidos (token_sesion, estado, total, fecha_creacion) 
                     VALUES ($1, 'carrito', 0, NOW()) RETURNING id`,
                    [sessionToken]
                );
                pedidoId = newCartResult.rows[0].id;
            } else {
                pedidoId = cartResult.rows[0].id;
            }
        } else {
            return res.status(400).json({
                success: false,
                error: 'Se requiere token de sesión o usuario registrado'
            });
        }

        // Verificar si el producto ya está en el carrito
        const existingItemResult = await pool.query(
            `SELECT id, cantidad FROM productos_pedidos 
             WHERE pedido_id = $1 AND producto_id = $2 AND talla = $3 AND color = $4`,
            [pedidoId, producto_id, talla || '', color || '']
        );

        const precioUnitario = parseFloat(producto.precio);
        let productoId;

        if (existingItemResult.rows.length > 0) {
            // Actualizar cantidad si ya existe
            const nuevaCantidad = existingItemResult.rows[0].cantidad + parseInt(cantidad);
            const precioTotal = precioUnitario * nuevaCantidad;

            await pool.query(
                `UPDATE productos_pedidos 
                 SET cantidad = $1, precio_total = $2 
                 WHERE id = $3`,
                [nuevaCantidad, precioTotal, existingItemResult.rows[0].id]
            );
            productoId = existingItemResult.rows[0].id;
        } else {
            // Añadir nuevo item
            const precioTotal = precioUnitario * parseInt(cantidad);
            
            const insertResult = await pool.query(
                `INSERT INTO productos_pedidos 
                 (pedido_id, producto_id, cantidad, precio_unitario, precio_total, talla, color) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [pedidoId, producto_id, cantidad, precioUnitario, precioTotal, talla || '', color || '']
            );
            productoId = insertResult.rows[0].id;
        }

        // Actualizar total del pedido
        const totalResult = await pool.query(
            `SELECT SUM(precio_total) as total FROM productos_pedidos WHERE pedido_id = $1`,
            [pedidoId]
        );

        await pool.query(
            'UPDATE pedidos SET total = $1 WHERE id = $2',
            [totalResult.rows[0].total || 0, pedidoId]
        );

        res.json({
            success: true,
            message: 'Producto añadido al carrito exitosamente',
            item: {
                id: productoId,
                producto_id: producto_id,
                producto_nombre: producto.nombre,
                cantidad: cantidad,
                precio_unitario: precioUnitario,
                precio_total: precioUnitario * parseInt(cantidad),
                talla: talla || '',
                color: color || ''
            }
        });

    } catch (error) {
        console.error('Error añadiendo al carrito:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar cantidad de producto en carrito
const updateCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad } = req.body;
        const { sessionToken } = req.query;

        if (!cantidad || cantidad < 1) {
            return res.status(400).json({
                success: false,
                error: 'La cantidad debe ser mayor a 0'
            });
        }

        let whereClause;
        let queryParams;

        if (req.user && req.user.id) {
            whereClause = `pp.id = $1 AND p.user_id = $2 AND p.estado = 'carrito'`;
            queryParams = [id, req.user.id];
        } else if (sessionToken) {
            whereClause = `pp.id = $1 AND p.token_sesion = $2 AND p.estado = 'carrito'`;
            queryParams = [id, sessionToken];
        } else {
            return res.status(400).json({
                success: false,
                error: 'Se requiere token de sesión o usuario registrado'
            });
        }

        // Verificar que el item existe y pertenece al usuario/sesión
        const itemResult = await pool.query(
            `SELECT pp.id, pp.precio_unitario, pp.pedido_id 
             FROM productos_pedidos pp
             JOIN pedidos p ON pp.pedido_id = p.id
             WHERE ${whereClause}`,
            queryParams
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item del carrito no encontrado'
            });
        }

        const item = itemResult.rows[0];
        const precioTotal = parseFloat(item.precio_unitario) * parseInt(cantidad);

        // Actualizar cantidad y precio total
        await pool.query(
            'UPDATE productos_pedidos SET cantidad = $1, precio_total = $2 WHERE id = $3',
            [cantidad, precioTotal, id]
        );

        // Actualizar total del pedido
        const totalResult = await pool.query(
            `SELECT SUM(precio_total) as total FROM productos_pedidos WHERE pedido_id = $1`,
            [item.pedido_id]
        );

        await pool.query(
            'UPDATE pedidos SET total = $1 WHERE id = $2',
            [totalResult.rows[0].total || 0, item.pedido_id]
        );

        res.json({
            success: true,
            message: 'Item actualizado exitosamente',
            item: {
                id: id,
                cantidad: cantidad,
                precio_total: precioTotal
            }
        });

    } catch (error) {
        console.error('Error actualizando item del carrito:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Remover producto del carrito
const removeFromCart = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionToken } = req.query;

        let whereClause;
        let queryParams;

        if (req.user && req.user.id) {
            whereClause = `pp.id = $1 AND p.user_id = $2 AND p.estado = 'carrito'`;
            queryParams = [id, req.user.id];
        } else if (sessionToken) {
            whereClause = `pp.id = $1 AND p.token_sesion = $2 AND p.estado = 'carrito'`;
            queryParams = [id, sessionToken];
        } else {
            return res.status(400).json({
                success: false,
                error: 'Se requiere token de sesión o usuario registrado'
            });
        }

        // Verificar que el item existe y obtener pedido_id
        const itemResult = await pool.query(
            `SELECT pp.pedido_id 
             FROM productos_pedidos pp
             JOIN pedidos p ON pp.pedido_id = p.id
             WHERE ${whereClause}`,
            queryParams
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Item del carrito no encontrado'
            });
        }

        const pedidoId = itemResult.rows[0].pedido_id;

        // Eliminar item
        await pool.query('DELETE FROM productos_pedidos WHERE id = $1', [id]);

        // Actualizar total del pedido
        const totalResult = await pool.query(
            `SELECT SUM(precio_total) as total FROM productos_pedidos WHERE pedido_id = $1`,
            [pedidoId]
        );

        await pool.query(
            'UPDATE pedidos SET total = $1 WHERE id = $2',
            [totalResult.rows[0].total || 0, pedidoId]
        );

        res.json({
            success: true,
            message: 'Producto eliminado del carrito exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando item del carrito:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Limpiar carrito
const clearCart = async (req, res) => {
    try {
        const { sessionToken } = req.query;

        let whereClause;
        let queryParams;

        if (req.user && req.user.id) {
            whereClause = `user_id = $1 AND estado = 'carrito'`;
            queryParams = [req.user.id];
        } else if (sessionToken) {
            whereClause = `token_sesion = $1 AND estado = 'carrito'`;
            queryParams = [sessionToken];
        } else {
            return res.status(400).json({
                success: false,
                error: 'Se requiere token de sesión o usuario registrado'
            });
        }

        // Obtener ID del pedido
        const cartResult = await pool.query(
            `SELECT id FROM pedidos WHERE ${whereClause}`,
            queryParams
        );

        if (cartResult.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Carrito ya está vacío'
            });
        }

        const pedidoId = cartResult.rows[0].id;

        // Eliminar todos los productos del carrito
        await pool.query('DELETE FROM productos_pedidos WHERE pedido_id = $1', [pedidoId]);

        // Actualizar total del pedido a 0
        await pool.query(
            'UPDATE pedidos SET total = 0 WHERE id = $1',
            [pedidoId]
        );

        res.json({
            success: true,
            message: 'Carrito vaciado exitosamente'
        });

    } catch (error) {
        console.error('Error vaciando carrito:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    getActiveCart,
    createGuestCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    generateSessionToken
};
