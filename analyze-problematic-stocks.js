const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function analyzeProblematicStocks() {
    try {
        console.log('🔍 Analizando registros problemáticos en la tabla stock...\n');
        
        // Mostrar todos los registros actuales
        const allStocksQuery = `
            SELECT 
                s.id_stock,
                s.id_producto,
                p.nombre as producto_nombre,
                s.id_variante,
                v.nombre as variante_nombre,
                s.id_talla,
                t.nombre_talla,
                s.cantidad,
                s.precio,
                s.fecha_actualizacion
            FROM stock s
            LEFT JOIN productos p ON s.id_producto = p.id_producto
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            ORDER BY s.id_producto, s.id_variante, s.id_talla;
        `;
        
        const allStocks = await pool.query(allStocksQuery);
        console.log('📋 TODOS LOS REGISTROS DE STOCK ACTUALES:');
        console.log('='.repeat(120));
        console.table(allStocks.rows);
        
        // Identificar registros problemáticos
        const problematicQuery = `
            SELECT 
                s.id_stock,
                s.id_producto,
                p.nombre as producto_nombre,
                s.id_variante,
                v.nombre as variante_nombre,
                s.id_talla,
                t.nombre_talla,
                s.cantidad,
                s.precio,
                CASE 
                    WHEN s.cantidad = 0 AND s.precio = 0 THEN 'CANTIDAD Y PRECIO = 0'
                    WHEN s.cantidad = 0 THEN 'CANTIDAD = 0'
                    WHEN s.precio = 0 THEN 'PRECIO = 0'
                END as problema
            FROM stock s
            LEFT JOIN productos p ON s.id_producto = p.id_producto
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            WHERE s.cantidad = 0 OR s.precio = 0
            ORDER BY s.id_producto, s.id_variante, s.id_talla;
        `;
        
        const problematicStocks = await pool.query(problematicQuery);
        
        if (problematicStocks.rows.length > 0) {
            console.log('\n⚠️  REGISTROS PROBLEMÁTICOS ENCONTRADOS:');
            console.log('='.repeat(120));
            console.table(problematicStocks.rows);
            
            console.log(`\n📊 Resumen de problemas:`);
            console.log(`   Total registros problemáticos: ${problematicStocks.rows.length}`);
            
            const cantidadCero = problematicStocks.rows.filter(r => r.cantidad === 0).length;
            const precioCero = problematicStocks.rows.filter(r => parseFloat(r.precio) === 0).length;
            const ambos = problematicStocks.rows.filter(r => r.cantidad === 0 && parseFloat(r.precio) === 0).length;
            
            console.log(`   Con cantidad = 0: ${cantidadCero}`);
            console.log(`   Con precio = 0: ${precioCero}`);
            console.log(`   Con ambos = 0: ${ambos}`);
            
        } else {
            console.log('\n✅ No se encontraron registros problemáticos');
        }
        
        // Preguntar qué hacer con estos registros
        console.log('\n🎯 ACCIÓN PROPUESTA:');
        console.log('   Se implementará una función automática que:');
        console.log('   1. Elimine registros donde cantidad = 0 OR precio = 0');
        console.log('   2. Se ejecute automáticamente en INSERT/UPDATE del stock');
        console.log('   3. Mantenga la tabla limpia sin registros inválidos');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

analyzeProblematicStocks();
