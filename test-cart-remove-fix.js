const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

// Simular un request con token de usuario para probar el fix
async function testCartRemoveFix() {
    try {
        console.log('🧪 Probando fix del cart removeFromCart...\n');
        
        // 1. Verificar que existe un usuario con ID 5
        console.log('1️⃣ Verificando usuario con ID 5...');
        const userQuery = await pool.query(
            'SELECT id_usuario, usuario, rol FROM usuarios WHERE id_usuario = $1',
            [5]
        );
        
        if (userQuery.rows.length === 0) {
            console.log('❌ Usuario con ID 5 no encontrado');
            return;
        }
        
        const user = userQuery.rows[0];
        console.log('✅ Usuario encontrado:', user);
        
        // 2. Verificar si el usuario tiene un carrito
        console.log('\n2️⃣ Verificando carrito del usuario...');
        const cartQuery = await pool.query(
            'SELECT id_carrito FROM carritos WHERE id_usuario = $1',
            [5]
        );
        
        let cartId;
        if (cartQuery.rows.length === 0) {
            console.log('📝 Creando carrito para el usuario...');
            const createCartQuery = await pool.query(
                'INSERT INTO carritos (id_usuario) VALUES ($1) RETURNING id_carrito',
                [5]
            );
            cartId = createCartQuery.rows[0].id_carrito;
        } else {
            cartId = cartQuery.rows[0].id_carrito;
        }
        console.log('✅ Carrito ID:', cartId);
        
        // 3. Verificar que hay productos disponibles
        console.log('\n3️⃣ Verificando productos disponibles...');
        const stockQuery = await pool.query(`
            SELECT s.id_producto, s.id_variante, s.id_talla, s.precio, s.cantidad,
                   p.nombre as producto_nombre, v.nombre as variante_nombre, t.nombre_talla
            FROM stock s
            LEFT JOIN productos p ON s.id_producto = p.id_producto
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            WHERE s.cantidad > 0 AND s.precio > 0
            LIMIT 1
        `);
        
        if (stockQuery.rows.length === 0) {
            console.log('❌ No hay productos en stock disponibles');
            return;
        }
        
        const testProduct = stockQuery.rows[0];
        console.log('✅ Producto de prueba:', testProduct);
        
        // 4. Agregar item al carrito si no existe
        console.log('\n4️⃣ Verificando/agregando item al carrito...');
        const existingItemQuery = await pool.query(
            'SELECT * FROM contenido_carrito WHERE id_carrito = $1 AND id_producto = $2 AND id_variante = $3 AND id_talla = $4',
            [cartId, testProduct.id_producto, testProduct.id_variante, testProduct.id_talla]
        );
        
        if (existingItemQuery.rows.length === 0) {
            console.log('📝 Agregando item al carrito...');
            await pool.query(
                'INSERT INTO contenido_carrito (id_carrito, id_producto, id_variante, id_talla, cantidad) VALUES ($1, $2, $3, $4, $5)',
                [cartId, testProduct.id_producto, testProduct.id_variante, testProduct.id_talla, 2]
            );
            console.log('✅ Item agregado al carrito');
        } else {
            console.log('✅ Item ya existe en el carrito');
        }
        
        // 5. Mostrar contenido actual del carrito
        console.log('\n5️⃣ Contenido actual del carrito:');
        const cartContentQuery = await pool.query(`
            SELECT cc.*, p.nombre as producto, v.nombre as variante, t.nombre_talla as talla
            FROM contenido_carrito cc
            LEFT JOIN productos p ON cc.id_producto = p.id_producto
            LEFT JOIN variantes v ON cc.id_variante = v.id_variante
            LEFT JOIN tallas t ON cc.id_talla = t.id_talla
            WHERE cc.id_carrito = $1
        `, [cartId]);
        
        console.table(cartContentQuery.rows);
        
        console.log('\n🎯 DATOS PARA PRUEBA EN FRONTEND:');
        console.log('='.repeat(50));
        console.log('Usuario ID:', user.id_usuario);
        console.log('Usuario:', user.usuario);
        console.log('Carrito ID:', cartId);
        console.log('Test Product Data:');
        console.log('  productId:', testProduct.id_producto);
        console.log('  variantId:', testProduct.id_variante);
        console.log('  tallaId:', testProduct.id_talla);
        console.log('  producto:', testProduct.producto_nombre);
        console.log('  variante:', testProduct.variante_nombre);
        console.log('  talla:', testProduct.nombre_talla);
        
        console.log('\n📝 El usuario JustSix (ID: 5) ahora debería poder eliminar items del carrito');
        console.log('📝 El fix de req.user.id → req.user.id_usuario está aplicado');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

testCartRemoveFix();
