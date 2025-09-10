// Script para probar el endpoint removeFromCart con el usuario autenticado
const fetch = require('node-fetch');

async function testRemoveFromCart() {
    try {
        console.log('🧪 Probando endpoint POST /api/cart/remove con usuario autenticado...\n');
        
        // Simular datos del frontend - usar los datos reales del carrito del usuario
        const removeData = {
            productId: 5,    // Lucky Club Hoodie
            variantId: 14,   // Verde
            tallaId: 2       // S
        };
        
        // Token JWT del usuario JustSix (necesitas obtenerlo del localStorage del frontend)
        const authToken = 'Bearer YOUR_JWT_TOKEN_HERE'; // Reemplazar con token real
        
        console.log('📝 Datos a enviar:', removeData);
        console.log('📝 Usuario: JustSix (ID: 5)');
        console.log('📝 Endpoint: DELETE /api/cart/remove');
        
        // Hacer la petición
        const response = await fetch('http://localhost:5000/api/cart/remove', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken  // Token JWT del usuario
            },
            body: JSON.stringify(removeData)
        });
        
        const result = await response.json();
        
        console.log('\n📊 RESULTADO:');
        console.log('Status:', response.status);
        console.log('Success:', result.success);
        console.log('Message:', result.message);
        
        if (result.success) {
            console.log('✅ ÉXITO: Item eliminado del carrito');
            console.log('Total items en carrito:', result.cart?.totalItems || 'N/A');
            console.log('Total carrito:', `$${result.cart?.totalFinal || 'N/A'}`);
        } else {
            console.log('❌ ERROR:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.log('\n📝 NOTA: Asegúrate de que:');
        console.log('  1. El servidor esté corriendo en localhost:5000');
        console.log('  2. Tengas un token JWT válido del usuario JustSix');
        console.log('  3. El item existe en el carrito');
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    console.log('⚠️  NOTA: Este script requiere un token JWT válido');
    console.log('📝 Para obtener el token:');
    console.log('  1. Abre la aplicación frontend');
    console.log('  2. Inicia sesión como JustSix');
    console.log('  3. Ve a DevTools > Application > localStorage');
    console.log('  4. Copia el valor de "token"');
    console.log('  5. Reemplaza YOUR_JWT_TOKEN_HERE en este script');
    console.log('');
    console.log('🚀 Para probar sin token, usa el servidor desde el frontend directamente');
}

module.exports = { testRemoveFromCart };
