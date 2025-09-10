const CartModel = require('../models/cart.model');
const { convertPrices } = require('../utils/priceUtils');

class CartController {
    // Obtener el carrito del usuario o de la sesión
    static async getCart(req, res) {
        try {
            let cartId;
            
            if (req.user && req.user.id_usuario) {
                // Usuario autenticado - usar id_usuario
                console.log('🛒 Obteniendo carrito para usuario autenticado:', req.user.id_usuario);
                cartId = await CartModel.getOrCreateCartForUser(req.user.id_usuario);
            } else {
                // Usuario no autenticado - usar token de sesión
                let sessionToken = req.headers['x-session-token'];
                
                if (!sessionToken) {
                    // Crear nuevo token de sesión
                    sessionToken = CartModel.generateSessionToken();
                    res.setHeader('X-Session-Token', sessionToken);
                    console.log('🎫 Token de sesión generado:', sessionToken.substring(0, 10) + '...');
                }
                
                console.log('🛒 Obteniendo carrito para sesión:', sessionToken.substring(0, 10) + '...');
                cartId = await CartModel.getOrCreateCartForSession(sessionToken);
            }
            
            const cartSummary = await CartModel.getCartSummary(cartId);
            
            // Convertir precios a números en el resumen del carrito
            const processedCart = {
                id: cartId,
                ...cartSummary
            };
            
            // Si hay items en el carrito, convertir sus precios
            if (processedCart.items) {
                processedCart.items = processedCart.items.map(item => 
                    convertPrices(item, ['precio', 'precio_total_item', 'precio_unitario'])
                );
            }
            
            // Convertir totales
            if (processedCart.totalOriginal) processedCart.totalOriginal = parseFloat(processedCart.totalOriginal);
            if (processedCart.totalFinal) processedCart.totalFinal = parseFloat(processedCart.totalFinal);
            if (processedCart.totalDescuento) processedCart.totalDescuento = parseFloat(processedCart.totalDescuento);
            
            res.json({
                success: true,
                cart: processedCart,
                sessionToken: req.headers['x-session-token']
            });
        } catch (error) {
            console.error('Error obteniendo carrito:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // Agregar item al carrito
    static async addToCart(req, res) {
        try {
            const { productId, variantId, tallaId, cantidad = 1 } = req.body;
            
            // Validar datos requeridos
            if (!productId || !variantId || !tallaId) {
                return res.status(400).json({
                    success: false,
                    message: 'productId, variantId y tallaId son requeridos'
                });
            }
            
            if (cantidad <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La cantidad debe ser mayor a 0'
                });
            }
            
            let cartId;
            
            if (req.user && req.user.id_usuario) {
                // Usuario autenticado - usar id_usuario
                console.log('➕ Agregando al carrito para usuario autenticado:', req.user.id_usuario);
                cartId = await CartModel.getOrCreateCartForUser(req.user.id_usuario);
            } else {
                // Usuario no autenticado - usar token de sesión
                let sessionToken = req.headers['x-session-token'];
                
                if (!sessionToken) {
                    sessionToken = CartModel.generateSessionToken();
                    res.setHeader('X-Session-Token', sessionToken);
                    console.log('🎫 Token de sesión generado para agregar item:', sessionToken.substring(0, 10) + '...');
                }
                
                console.log('➕ Agregando al carrito para sesión:', sessionToken.substring(0, 10) + '...');
                cartId = await CartModel.getOrCreateCartForSession(sessionToken);
            }
            
            const updatedItems = await CartModel.addToCart(
                cartId, 
                parseInt(productId), 
                parseInt(variantId), 
                parseInt(tallaId), 
                parseInt(cantidad)
            );
            
            // Obtener resumen actualizado
            const cartSummary = await CartModel.getCartSummary(cartId);
            
            res.json({
                success: true,
                message: 'Producto agregado al carrito exitosamente',
                cart: {
                    id: cartId,
                    ...cartSummary
                }
            });
        } catch (error) {
            console.error('Error agregando al carrito:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Actualizar cantidad de un item
    static async updateQuantity(req, res) {
        try {
            const { productId, variantId, tallaId, cantidad } = req.body;
            
            // Validar datos requeridos
            if (!productId || !variantId || !tallaId || cantidad === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'productId, variantId, tallaId y cantidad son requeridos'
                });
            }
            
            let cartId;
            
            if (req.user && req.user.id_usuario) {
                cartId = await CartModel.getOrCreateCartForUser(req.user.id_usuario);
            } else {
                let sessionToken = req.headers['x-session-token'];
                if (!sessionToken) {
                    return res.status(400).json({
                        success: false,
                        message: 'Token de sesión requerido para usuarios no autenticados'
                    });
                }
                cartId = await CartModel.getOrCreateCartForSession(sessionToken);
            }
            
            await CartModel.updateQuantity(
                cartId,
                parseInt(productId),
                parseInt(variantId),
                parseInt(tallaId),
                parseInt(cantidad)
            );
            
            // Obtener resumen actualizado
            const cartSummary = await CartModel.getCartSummary(cartId);
            
            res.json({
                success: true,
                message: 'Cantidad actualizada exitosamente',
                cart: {
                    id: cartId,
                    ...cartSummary
                }
            });
        } catch (error) {
            console.error('Error actualizando cantidad:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Eliminar item del carrito
    static async removeFromCart(req, res) {
        try {
            const { productId, variantId, tallaId } = req.body;
            
            // Validar datos requeridos
            if (!productId || !variantId || !tallaId) {
                return res.status(400).json({
                    success: false,
                    message: 'productId, variantId y tallaId son requeridos'
                });
            }
            
            let cartId;
            
            if (req.user && req.user.id_usuario) {
                cartId = await CartModel.getOrCreateCartForUser(req.user.id_usuario);
            } else {
                let sessionToken = req.headers['x-session-token'];
                if (!sessionToken) {
                    return res.status(400).json({
                        success: false,
                        message: 'Token de sesión requerido para usuarios no autenticados'
                    });
                }
                cartId = await CartModel.getOrCreateCartForSession(sessionToken);
            }
            
            await CartModel.removeFromCart(
                cartId,
                parseInt(productId),
                parseInt(variantId),
                parseInt(tallaId)
            );
            
            // Obtener resumen actualizado
            const cartSummary = await CartModel.getCartSummary(cartId);
            
            res.json({
                success: true,
                message: 'Producto eliminado del carrito exitosamente',
                cart: {
                    id: cartId,
                    ...cartSummary
                }
            });
        } catch (error) {
            console.error('Error eliminando del carrito:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Limpiar todo el carrito
    static async clearCart(req, res) {
        try {
            let cartId;
            
            if (req.user && req.user.id_usuario) {
                cartId = await CartModel.getOrCreateCartForUser(req.user.id_usuario);
            } else {
                let sessionToken = req.headers['x-session-token'];
                if (!sessionToken) {
                    return res.status(400).json({
                        success: false,
                        message: 'Token de sesión requerido para usuarios no autenticados'
                    });
                }
                cartId = await CartModel.getOrCreateCartForSession(sessionToken);
            }
            
            await CartModel.clearCart(cartId);
            
            res.json({
                success: true,
                message: 'Carrito limpiado exitosamente',
                cart: {
                    id: cartId,
                    items: [],
                    totalItems: 0,
                    totalOriginal: 0,
                    totalFinal: 0,
                    totalDescuento: 0,
                    tieneDescuentos: false
                }
            });
        } catch (error) {
            console.error('Error limpiando carrito:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Migrar carrito de sesión a usuario autenticado (se ejecuta automáticamente al hacer login)
    static async migrateCart(req, res) {
        try {
            if (!req.user || !req.user.id_usuario) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            
            const sessionToken = req.headers['x-session-token'];
            if (!sessionToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Token de sesión no proporcionado'
                });
            }
            
            const result = await CartModel.migrateSessionCartToUser(sessionToken, req.user.id_usuario);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            // Obtener el carrito actualizado del usuario
            const cartSummary = await CartModel.getCartSummary(result.cartId);
            
            res.json({
                success: true,
                message: result.message,
                cart: {
                    id: result.cartId,
                    ...cartSummary
                }
            });
        } catch (error) {
            console.error('Error migrando carrito:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Migrar carrito de usuario a token de sesión (para logout)
    static async migrateCartToSession(req, res) {
        try {
            const { sessionToken } = req.body;
            
            if (!req.user || !req.user.id_usuario) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuario no autenticado'
                });
            }
            
            if (!sessionToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Token de sesión requerido'
                });
            }
            
            console.log('🔄 Migrando carrito de usuario a sesión:', {
                userId: req.user.id_usuario,
                sessionToken: sessionToken.substring(0, 10) + '...'
            });
            
            const result = await CartModel.migrateUserCartToSession(req.user.id_usuario, sessionToken);
            const cartSummary = await CartModel.getCartSummary(result.cartId);
            
            res.json({
                success: true,
                message: result.message,
                cart: {
                    id: result.cartId,
                    ...cartSummary
                }
            });
        } catch (error) {
            console.error('Error migrando carrito a sesión:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener conteo rápido del carrito (para badges)
    static async getCartCount(req, res) {
        try {
            let cartId;
            
            if (req.user && req.user.id_usuario) {
                cartId = await CartModel.getOrCreateCartForUser(req.user.id_usuario);
            } else {
                let sessionToken = req.headers['x-session-token'];
                if (!sessionToken) {
                    return res.json({
                        success: true,
                        totalItems: 0
                    });
                }
                cartId = await CartModel.getOrCreateCartForSession(sessionToken);
            }
            
            const cartSummary = await CartModel.getCartSummary(cartId);
            
            res.json({
                success: true,
                totalItems: cartSummary.totalItems
            });
        } catch (error) {
            console.error('Error obteniendo conteo del carrito:', error);
            res.status(500).json({
                success: false,
                message: error.message,
                totalItems: 0
            });
        }
    }
}

module.exports = CartController;
