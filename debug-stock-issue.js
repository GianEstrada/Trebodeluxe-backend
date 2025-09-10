const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkStockIssue() {
    try {
        console.log('🔍 Investigando problema de stock...\n');
        
        // 1. Ver el stock actual de todas las variantes del producto ID 5
        console.log('1️⃣ Stock real en base de datos (producto ID 5):');
        const stockQuery = await pool.query(`
            SELECT 
                s.id_stock,
                s.id_producto,
                p.nombre as producto,
                s.id_variante,
                v.nombre as variante,
                s.id_talla,
                t.nombre_talla as talla,
                s.cantidad,
                s.precio,
                s.fecha_actualizacion
            FROM stock s
            LEFT JOIN productos p ON s.id_producto = p.id_producto
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            WHERE s.id_producto = 5
            ORDER BY s.id_variante, s.id_talla;
        `);
        
        console.table(stockQuery.rows);
        
        // 2. Verificar específicamente la variante 14, talla 2 que está dando error
        console.log('\n2️⃣ Detalle específico del item que falla:');
        const specificItem = stockQuery.rows.find(row => 
            row.id_variante === 14 && row.id_talla === 2
        );
        
        if (specificItem) {
            console.log('📦 Item específico (productId: 5, variantId: 14, tallaId: 2):');
            console.log(`   Producto: ${specificItem.producto}`);
            console.log(`   Variante: ${specificItem.variante}`);
            console.log(`   Talla: ${specificItem.talla}`);
            console.log(`   Stock disponible: ${specificItem.cantidad}`);
            console.log(`   Precio: $${specificItem.precio}`);
        } else {
            console.log('❌ No se encontró el item específico en stock');
        }
        
        // 3. Verificar cuánto hay en el carrito del usuario
        console.log('\n3️⃣ Verificando carrito del usuario (ID: 5):');
        const cartQuery = await pool.query(`
            SELECT 
                cc.id_producto,
                cc.id_variante,
                cc.id_talla,
                cc.cantidad as cantidad_en_carrito,
                p.nombre as producto,
                v.nombre as variante,
                t.nombre_talla as talla
            FROM contenido_carrito cc
            LEFT JOIN carritos c ON cc.id_carrito = c.id_carrito
            LEFT JOIN productos p ON cc.id_producto = p.id_producto
            LEFT JOIN variantes v ON cc.id_variante = v.id_variante
            LEFT JOIN tallas t ON cc.id_talla = t.id_talla
            WHERE c.id_usuario = 5
            ORDER BY cc.id_producto, cc.id_variante, cc.id_talla;
        `);
        
        console.table(cartQuery.rows);
        
        // 4. Calcular stock disponible real considerando lo que ya está en el carrito
        console.log('\n4️⃣ Análisis de disponibilidad:');
        
        const cartItem = cartQuery.rows.find(row => 
            row.id_producto === 5 && row.id_variante === 14 && row.id_talla === 2
        );
        
        if (specificItem && cartItem) {
            const stockTotal = parseInt(specificItem.cantidad);
            const enCarrito = parseInt(cartItem.cantidad_en_carrito);
            const disponible = stockTotal - enCarrito;
            
            console.log(`📊 Producto: ${specificItem.producto} - ${specificItem.variante} ${specificItem.talla}`);
            console.log(`   Stock total en BD: ${stockTotal}`);
            console.log(`   Ya en carrito: ${enCarrito}`);
            console.log(`   Disponible para agregar: ${disponible}`);
            console.log(`   Usuario quiere agregar: 3`);
            console.log(`   ¿Suficiente stock? ${disponible >= 3 ? '✅ SÍ' : '❌ NO'}`);
            
            if (disponible < 3) {
                console.log(`   ⚠️  Backend responde correctamente: "Stock disponible: ${disponible}"`);
            }
        } else if (specificItem && !cartItem) {
            console.log(`📊 Producto: ${specificItem.producto} - ${specificItem.variante} ${specificItem.talla}`);
            console.log(`   Stock total en BD: ${specificItem.cantidad}`);
            console.log(`   Ya en carrito: 0`);
            console.log(`   Disponible para agregar: ${specificItem.cantidad}`);
            console.log(`   Usuario quiere agregar: 3`);
            console.log(`   ¿Suficiente stock? ${specificItem.cantidad >= 3 ? '✅ SÍ' : '❌ NO'}`);
        }
        
        // 5. Verificar todas las variantes para el problema del frontend
        console.log('\n5️⃣ Resumen de stock por variante:');
        const variantSummary = {};
        
        stockQuery.rows.forEach(row => {
            if (!variantSummary[row.id_variante]) {
                variantSummary[row.id_variante] = {
                    nombre: row.variante,
                    total_stock: 0,
                    tallas_disponibles: 0
                };
            }
            variantSummary[row.id_variante].total_stock += parseInt(row.cantidad);
            if (parseInt(row.cantidad) > 0) {
                variantSummary[row.id_variante].tallas_disponibles++;
            }
        });
        
        Object.keys(variantSummary).forEach(variantId => {
            const variant = variantSummary[variantId];
            console.log(`📦 Variante ${variantId} (${variant.nombre}):`);
            console.log(`   Total stock: ${variant.total_stock} unidades`);
            console.log(`   Tallas con stock: ${variant.tallas_disponibles}`);
        });
        
        // 6. Verificar la lógica que usa el frontend para mostrar stock
        console.log('\n6️⃣ Posibles causas del problema:');
        console.log('🔍 Frontend vs Backend:');
        console.log('   - Frontend suma stock de todas las tallas de una variante');
        console.log('   - Backend valida stock por talla específica');
        console.log('   - Puede que el usuario ya tenga items en carrito');
        
        console.log('\n🔧 Para resolver:');
        console.log('   1. Verificar qué API usa el frontend para obtener stock');
        console.log('   2. Asegurar que muestre stock por talla, no total por variante');
        console.log('   3. Considerar items ya en carrito al mostrar disponibilidad');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkStockIssue();
