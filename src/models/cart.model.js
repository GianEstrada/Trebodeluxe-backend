const { pool } = require('../config/db');

class CartModel {
    // Generar un token de sesión único para usuarios no autenticados
    static generateSessionToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    // Obtener o crear carrito para usuario autenticado
    static async getOrCreateCartForUser(userId) {
        const client = await pool.connect();
        
        try {
            // Buscar carrito existente
            let result = await client.query(
                'SELECT id_carrito FROM carritos WHERE id_usuario = $1',
                [userId]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0].id_carrito;
            }
            
            // Crear nuevo carrito
            result = await client.query(
                'INSERT INTO carritos (id_usuario) VALUES ($1) RETURNING id_carrito',
                [userId]
            );
            
            return result.rows[0].id_carrito;
        } finally {
            client.release();
        }
    }

    // Obtener o crear carrito para usuario no autenticado usando token de sesión
    static async getOrCreateCartForSession(sessionToken) {
        const client = await pool.connect();
        
        try {
            // Buscar carrito existente
            let result = await client.query(
                'SELECT id_carrito FROM carritos WHERE token_sesion = $1',
                [sessionToken]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0].id_carrito;
            }
            
            // Crear nuevo carrito
            result = await client.query(
                'INSERT INTO carritos (token_sesion) VALUES ($1) RETURNING id_carrito',
                [sessionToken]
            );
            
            return result.rows[0].id_carrito;
        } finally {
            client.release();
        }
    }

    // Obtener el contenido completo del carrito
    static async getCartContents(cartId) {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    cc.id_contenido,
                    cc.id_carrito,
                    cc.cantidad,
                    cc.fecha_agregado,
                    p.id_producto,
                    p.nombre AS nombre_producto,
                    p.descripcion AS descripcion_producto,
                    v.id_variante,
                    v.nombre AS nombre_variante,
                    t.id_talla,
                    t.nombre_talla,
                    st.nombre AS sistema_talla,
                    s.precio,
                    s.cantidad AS stock_disponible,
                    -- Obtener la primera imagen de la variante
                    (
                        SELECT iv.url 
                        FROM imagenes_variante iv 
                        WHERE iv.id_variante = v.id_variante 
                        ORDER BY iv.orden ASC 
                        LIMIT 1
                    ) AS imagen_variante,
                    -- Calcular precio total por item
                    (s.precio * cc.cantidad) AS precio_total_item,
                    -- Por ahora, sin promociones para simplificar
                    0 AS descuento_porcentaje
                FROM contenido_carrito cc
                JOIN productos p ON cc.id_producto = p.id_producto
                JOIN variantes v ON cc.id_variante = v.id_variante
                JOIN tallas t ON cc.id_talla = t.id_talla
                JOIN sistemas_talla st ON t.id_sistema_talla = st.id_sistema_talla
                JOIN stock s ON s.id_producto = p.id_producto 
                    AND s.id_variante = v.id_variante 
                    AND s.id_talla = t.id_talla
                WHERE cc.id_carrito = $1
                ORDER BY cc.fecha_agregado DESC
            `;
            
            const result = await client.query(query, [cartId]);
            
            // Procesar los resultados para calcular precios con descuentos
            const items = result.rows.map(item => {
                const precioOriginal = parseFloat(item.precio_total_item);
                let precioFinal = precioOriginal;
                let tieneDescuento = false;
                
                if (item.descuento_porcentaje > 0) {
                    precioFinal = precioOriginal * (1 - item.descuento_porcentaje / 100);
                    tieneDescuento = true;
                }
                
                return {
                    ...item,
                    precio: parseFloat(item.precio),
                    precio_total_item: precioOriginal,
                    precio_final_item: precioFinal,
                    tiene_descuento: tieneDescuento,
                    descuento_porcentaje: parseFloat(item.descuento_porcentaje || 0)
                };
            });
            
            return items;
        } finally {
            client.release();
        }
    }

    // Agregar item al carrito
    static async addToCart(cartId, productId, variantId, tallaId, cantidad = 1) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Verificar que el producto, variante y talla existan y tengan stock
            const stockCheck = await client.query(
                'SELECT cantidad FROM stock WHERE id_producto = $1 AND id_variante = $2 AND id_talla = $3',
                [productId, variantId, tallaId]
            );
            
            if (stockCheck.rows.length === 0) {
                throw new Error('Producto, variante o talla no encontrados');
            }
            
            const stockDisponible = stockCheck.rows[0].cantidad;
            
            // Verificar si el item ya existe en el carrito
            const existingItem = await client.query(
                'SELECT id_contenido, cantidad FROM contenido_carrito WHERE id_carrito = $1 AND id_producto = $2 AND id_variante = $3 AND id_talla = $4',
                [cartId, productId, variantId, tallaId]
            );
            
            let nuevaCantidad = cantidad;
            
            if (existingItem.rows.length > 0) {
                // El item ya existe, actualizar cantidad
                nuevaCantidad = existingItem.rows[0].cantidad + cantidad;
                
                if (nuevaCantidad > stockDisponible) {
                    throw new Error(`Stock insuficiente. Stock disponible: ${stockDisponible}`);
                }
                
                await client.query(
                    'UPDATE contenido_carrito SET cantidad = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_contenido = $2',
                    [nuevaCantidad, existingItem.rows[0].id_contenido]
                );
            } else {
                // Nuevo item
                if (cantidad > stockDisponible) {
                    throw new Error(`Stock insuficiente. Stock disponible: ${stockDisponible}`);
                }
                
                await client.query(
                    'INSERT INTO contenido_carrito (id_carrito, id_producto, id_variante, id_talla, cantidad) VALUES ($1, $2, $3, $4, $5)',
                    [cartId, productId, variantId, tallaId, cantidad]
                );
            }
            
            await client.query('COMMIT');
            
            // Retornar el contenido actualizado del carrito
            return await this.getCartContents(cartId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Actualizar cantidad de un item en el carrito
    static async updateQuantity(cartId, productId, variantId, tallaId, cantidad) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            if (cantidad <= 0) {
                // Si la cantidad es 0 o menor, eliminar el item
                await client.query(
                    'DELETE FROM contenido_carrito WHERE id_carrito = $1 AND id_producto = $2 AND id_variante = $3 AND id_talla = $4',
                    [cartId, productId, variantId, tallaId]
                );
            } else {
                // Verificar stock disponible
                const stockCheck = await client.query(
                    'SELECT cantidad FROM stock WHERE id_producto = $1 AND id_variante = $2 AND id_talla = $3',
                    [productId, variantId, tallaId]
                );
                
                if (stockCheck.rows.length === 0) {
                    throw new Error('Producto no encontrado');
                }
                
                const stockDisponible = stockCheck.rows[0].cantidad;
                if (cantidad > stockDisponible) {
                    throw new Error(`Stock insuficiente. Stock disponible: ${stockDisponible}`);
                }
                
                // Actualizar cantidad
                const result = await client.query(
                    'UPDATE contenido_carrito SET cantidad = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_carrito = $2 AND id_producto = $3 AND id_variante = $4 AND id_talla = $5',
                    [cantidad, cartId, productId, variantId, tallaId]
                );
                
                if (result.rowCount === 0) {
                    throw new Error('Item no encontrado en el carrito');
                }
            }
            
            await client.query('COMMIT');
            
            // Retornar el contenido actualizado del carrito
            return await this.getCartContents(cartId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Eliminar item del carrito
    static async removeFromCart(cartId, productId, variantId, tallaId) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'DELETE FROM contenido_carrito WHERE id_carrito = $1 AND id_producto = $2 AND id_variante = $3 AND id_talla = $4',
                [cartId, productId, variantId, tallaId]
            );
            
            if (result.rowCount === 0) {
                throw new Error('Item no encontrado en el carrito');
            }
            
            // Retornar el contenido actualizado del carrito
            return await this.getCartContents(cartId);
        } finally {
            client.release();
        }
    }

    // Limpiar todo el carrito
    static async clearCart(cartId) {
        const client = await pool.connect();
        
        try {
            await client.query('DELETE FROM contenido_carrito WHERE id_carrito = $1', [cartId]);
            return { success: true, message: 'Carrito limpiado exitosamente' };
        } finally {
            client.release();
        }
    }

    // Obtener resumen del carrito (totales)
    static async getCartSummary(cartId) {
        const items = await this.getCartContents(cartId);
        
        let totalItems = 0;
        let totalOriginal = 0;
        let totalFinal = 0;
        let totalDescuento = 0;
        
        items.forEach(item => {
            totalItems += item.cantidad;
            totalOriginal += item.precio_total_item;
            totalFinal += item.precio_final_item;
            
            if (item.tiene_descuento) {
                totalDescuento += (item.precio_total_item - item.precio_final_item);
            }
        });
        
        return {
            items,
            totalItems,
            totalOriginal: parseFloat(totalOriginal.toFixed(2)),
            totalFinal: parseFloat(totalFinal.toFixed(2)),
            totalDescuento: parseFloat(totalDescuento.toFixed(2)),
            tieneDescuentos: totalDescuento > 0
        };
    }

    // Migrar carrito de sesión a usuario autenticado
    static async migrateSessionCartToUser(sessionToken, userId) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Buscar carrito de sesión
            const sessionCart = await client.query(
                'SELECT id_carrito FROM carritos WHERE token_sesion = $1',
                [sessionToken]
            );
            
            if (sessionCart.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: true, message: 'No hay carrito de sesión para migrar' };
            }
            
            const sessionCartId = sessionCart.rows[0].id_carrito;
            
            // Obtener o crear carrito de usuario
            const userCartId = await this.getOrCreateCartForUser(userId);
            
            if (sessionCartId === userCartId) {
                // Es el mismo carrito, no hay nada que migrar
                await client.query('ROLLBACK');
                return { success: true, message: 'Carrito ya pertenece al usuario' };
            }
            
            // Obtener items del carrito de sesión
            const sessionItems = await client.query(
                'SELECT id_producto, id_variante, id_talla, cantidad FROM contenido_carrito WHERE id_carrito = $1',
                [sessionCartId]
            );
            
            // Migrar cada item al carrito del usuario
            for (const item of sessionItems.rows) {
                // Verificar si el item ya existe en el carrito del usuario
                const existingUserItem = await client.query(
                    'SELECT cantidad FROM contenido_carrito WHERE id_carrito = $1 AND id_producto = $2 AND id_variante = $3 AND id_talla = $4',
                    [userCartId, item.id_producto, item.id_variante, item.id_talla]
                );
                
                if (existingUserItem.rows.length > 0) {
                    // Item existe, sumar cantidades
                    const nuevaCantidad = existingUserItem.rows[0].cantidad + item.cantidad;
                    await client.query(
                        'UPDATE contenido_carrito SET cantidad = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_carrito = $2 AND id_producto = $3 AND id_variante = $4 AND id_talla = $5',
                        [nuevaCantidad, userCartId, item.id_producto, item.id_variante, item.id_talla]
                    );
                } else {
                    // Item no existe, insertarlo
                    await client.query(
                        'INSERT INTO contenido_carrito (id_carrito, id_producto, id_variante, id_talla, cantidad) VALUES ($1, $2, $3, $4, $5)',
                        [userCartId, item.id_producto, item.id_variante, item.id_talla, item.cantidad]
                    );
                }
            }
            
            // Eliminar carrito de sesión
            await client.query('DELETE FROM carritos WHERE id_carrito = $1', [sessionCartId]);
            
            await client.query('COMMIT');
            
            return { 
                success: true, 
                message: 'Carrito migrado exitosamente',
                cartId: userCartId 
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Migrar carrito de usuario autenticado a token de sesión (para logout)
    static async migrateUserCartToSession(userId, sessionToken) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Buscar carrito del usuario
            const userCart = await client.query(
                'SELECT id_carrito FROM carritos WHERE id_usuario = $1',
                [userId]
            );
            
            if (userCart.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: true, message: 'No hay carrito de usuario para migrar' };
            }
            
            const userCartId = userCart.rows[0].id_carrito;
            
            // Obtener o crear carrito de sesión
            const sessionCartId = await this.getOrCreateCartForSession(sessionToken);
            
            if (userCartId === sessionCartId) {
                // Es el mismo carrito, no hay nada que migrar
                await client.query('ROLLBACK');
                return { success: true, message: 'Carrito ya está vinculado a sesión' };
            }
            
            // Obtener items del carrito del usuario
            const userItems = await client.query(
                'SELECT id_producto, id_variante, id_talla, cantidad FROM contenido_carrito WHERE id_carrito = $1',
                [userCartId]
            );
            
            // Migrar cada item al carrito de sesión
            for (const item of userItems.rows) {
                // Verificar si el item ya existe en el carrito de sesión
                const existingSessionItem = await client.query(
                    'SELECT cantidad FROM contenido_carrito WHERE id_carrito = $1 AND id_producto = $2 AND id_variante = $3 AND id_talla = $4',
                    [sessionCartId, item.id_producto, item.id_variante, item.id_talla]
                );
                
                if (existingSessionItem.rows.length > 0) {
                    // Item existe, sumar cantidades
                    const nuevaCantidad = existingSessionItem.rows[0].cantidad + item.cantidad;
                    await client.query(
                        'UPDATE contenido_carrito SET cantidad = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_carrito = $2 AND id_producto = $3 AND id_variante = $4 AND id_talla = $5',
                        [nuevaCantidad, sessionCartId, item.id_producto, item.id_variante, item.id_talla]
                    );
                } else {
                    // Item no existe, insertarlo
                    await client.query(
                        'INSERT INTO contenido_carrito (id_carrito, id_producto, id_variante, id_talla, cantidad) VALUES ($1, $2, $3, $4, $5)',
                        [sessionCartId, item.id_producto, item.id_variante, item.id_talla, item.cantidad]
                    );
                }
            }
            
            // Eliminar carrito del usuario
            await client.query('DELETE FROM carritos WHERE id_carrito = $1', [userCartId]);
            
            await client.query('COMMIT');
            
            return { 
                success: true, 
                message: 'Carrito migrado a sesión exitosamente',
                cartId: sessionCartId 
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = CartModel;
