#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'https://trebodeluxe-backend.onrender.com';
const API_URL = `${BASE_URL}/api`;

// Función para hacer peticiones HTTP con manejo de errores
async function makeRequest(method, url, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${API_URL}${url}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

async function testCartAPI() {
    console.log('🚀 Iniciando pruebas de la API del carrito...\n');
    
    let sessionToken = null;
    
    // 1. Obtener carrito vacío (sin autenticación)
    console.log('1. 📦 Obteniendo carrito vacío...');
    const emptyCartResult = await makeRequest('GET', '/cart');
    
    if (emptyCartResult.success) {
        console.log('✅ Carrito vacío obtenido exitosamente');
        sessionToken = emptyCartResult.data.sessionToken;
        console.log(`   Token de sesión: ${sessionToken}`);
        console.log(`   Total items: ${emptyCartResult.data.cart.totalItems}`);
        console.log(`   Total: $${emptyCartResult.data.cart.totalFinal}`);
    } else {
        console.log('❌ Error obteniendo carrito vacío:', emptyCartResult.error);
        return;
    }
    
    console.log('\n');
    
    // 2. Verificar que tenemos productos en la base de datos
    console.log('2. 🔍 Verificando productos disponibles...');
    const productsResult = await makeRequest('GET', '/products/recent?limit=5');
    
    if (!productsResult.success || !productsResult.data.products || productsResult.data.products.length === 0) {
        console.log('❌ No hay productos disponibles para probar el carrito');
        return;
    }
    
    const products = productsResult.data.products;
    console.log(`✅ Encontrados ${products.length} productos para probar`);
    
    // Usar el primer producto para las pruebas
    const testProduct = products[0];
    console.log(`   Usando producto: ${testProduct.nombre} (ID: ${testProduct.id_producto})`);
    
    // Obtener las variantes y tallas del producto
    const productDetailResult = await makeRequest('GET', `/products/${testProduct.id_producto}`);
    if (!productDetailResult.success) {
        console.log('❌ Error obteniendo detalles del producto:', productDetailResult.error);
        return;
    }
    
    const productDetail = productDetailResult.data.product;
    if (!productDetail.variantes || productDetail.variantes.length === 0) {
        console.log('❌ El producto no tiene variantes disponibles');
        return;
    }
    
    const variant = productDetail.variantes[0];
    console.log(`   Usando variante: ${variant.nombre} (ID: ${variant.id_variante})`);
    
    if (!productDetail.tallas_disponibles || productDetail.tallas_disponibles.length === 0) {
        console.log('❌ El producto no tiene tallas disponibles');
        return;
    }
    
    const talla = productDetail.tallas_disponibles.find(t => t.cantidad > 0);
    if (!talla) {
        console.log('❌ No hay tallas con stock disponible');
        return;
    }
    
    console.log(`   Usando talla: ${talla.nombre_talla} (ID: ${talla.id_talla}, Stock: ${talla.cantidad})`);
    
    console.log('\n');
    
    // 3. Agregar producto al carrito
    console.log('3. ➕ Agregando producto al carrito...');
    const addToCartData = {
        productId: testProduct.id_producto,
        variantId: variant.id_variante,
        tallaId: talla.id_talla,
        cantidad: 1
    };
    
    const addResult = await makeRequest('POST', '/cart/add', addToCartData, {
        'X-Session-Token': sessionToken
    });
    
    if (addResult.success) {
        console.log('✅ Producto agregado al carrito exitosamente');
        console.log(`   Total items: ${addResult.data.cart.totalItems}`);
        console.log(`   Total: $${addResult.data.cart.totalFinal}`);
        console.log(`   Items en carrito: ${addResult.data.cart.items.length}`);
    } else {
        console.log('❌ Error agregando al carrito:', addResult.error);
        return;
    }
    
    console.log('\n');
    
    // 4. Obtener carrito con productos
    console.log('4. 📦 Obteniendo carrito con productos...');
    const cartWithItemsResult = await makeRequest('GET', '/cart', null, {
        'X-Session-Token': sessionToken
    });
    
    if (cartWithItemsResult.success) {
        console.log('✅ Carrito obtenido exitosamente');
        const cart = cartWithItemsResult.data.cart;
        console.log(`   Total items: ${cart.totalItems}`);
        console.log(`   Total original: $${cart.totalOriginal}`);
        console.log(`   Total final: $${cart.totalFinal}`);
        console.log(`   Tiene descuentos: ${cart.tieneDescuentos}`);
        
        if (cart.items.length > 0) {
            const item = cart.items[0];
            console.log(`   Primer item:`);
            console.log(`     - Producto: ${item.nombre_producto}`);
            console.log(`     - Variante: ${item.nombre_variante}`);
            console.log(`     - Talla: ${item.nombre_talla}`);
            console.log(`     - Cantidad: ${item.cantidad}`);
            console.log(`     - Precio unitario: $${item.precio}`);
            console.log(`     - Precio total: $${item.precio_final_item}`);
            console.log(`     - Stock disponible: ${item.stock_disponible}`);
        }
    } else {
        console.log('❌ Error obteniendo carrito con productos:', cartWithItemsResult.error);
        return;
    }
    
    console.log('\n');
    
    // 5. Obtener conteo del carrito
    console.log('5. 🔢 Obteniendo conteo del carrito...');
    const countResult = await makeRequest('GET', '/cart/count', null, {
        'X-Session-Token': sessionToken
    });
    
    if (countResult.success) {
        console.log('✅ Conteo obtenido exitosamente');
        console.log(`   Total items: ${countResult.data.totalItems}`);
    } else {
        console.log('❌ Error obteniendo conteo:', countResult.error);
    }
    
    console.log('\n');
    
    // 6. Actualizar cantidad
    console.log('6. 📝 Actualizando cantidad del producto...');
    const updateData = {
        productId: testProduct.id_producto,
        variantId: variant.id_variante,
        tallaId: talla.id_talla,
        cantidad: 2
    };
    
    const updateResult = await makeRequest('PUT', '/cart/update', updateData, {
        'X-Session-Token': sessionToken
    });
    
    if (updateResult.success) {
        console.log('✅ Cantidad actualizada exitosamente');
        console.log(`   Total items: ${updateResult.data.cart.totalItems}`);
        console.log(`   Total: $${updateResult.data.cart.totalFinal}`);
    } else {
        console.log('❌ Error actualizando cantidad:', updateResult.error);
    }
    
    console.log('\n');
    
    // 7. Eliminar producto del carrito
    console.log('7. 🗑️ Eliminando producto del carrito...');
    const removeData = {
        productId: testProduct.id_producto,
        variantId: variant.id_variante,
        tallaId: talla.id_talla
    };
    
    const removeResult = await makeRequest('DELETE', '/cart/remove', removeData, {
        'X-Session-Token': sessionToken
    });
    
    if (removeResult.success) {
        console.log('✅ Producto eliminado exitosamente');
        console.log(`   Total items: ${removeResult.data.cart.totalItems}`);
        console.log(`   Total: $${removeResult.data.cart.totalFinal}`);
    } else {
        console.log('❌ Error eliminando producto:', removeResult.error);
    }
    
    console.log('\n');
    
    // 8. Agregar producto nuevamente para probar limpieza
    console.log('8. ➕ Agregando producto nuevamente...');
    const addAgainResult = await makeRequest('POST', '/cart/add', addToCartData, {
        'X-Session-Token': sessionToken
    });
    
    if (addAgainResult.success) {
        console.log('✅ Producto agregado nuevamente');
        console.log(`   Total items: ${addAgainResult.data.cart.totalItems}`);
    } else {
        console.log('❌ Error agregando producto nuevamente:', addAgainResult.error);
    }
    
    console.log('\n');
    
    // 9. Limpiar carrito
    console.log('9. 🧹 Limpiando carrito...');
    const clearResult = await makeRequest('DELETE', '/cart/clear', null, {
        'X-Session-Token': sessionToken
    });
    
    if (clearResult.success) {
        console.log('✅ Carrito limpiado exitosamente');
        console.log(`   Total items: ${clearResult.data.cart.totalItems}`);
        console.log(`   Total: $${clearResult.data.cart.totalFinal}`);
    } else {
        console.log('❌ Error limpiando carrito:', clearResult.error);
    }
    
    console.log('\n✨ Pruebas de la API del carrito completadas exitosamente!');
}

// Ejecutar las pruebas
if (require.main === module) {
    testCartAPI().catch(console.error);
}

module.exports = { testCartAPI };
