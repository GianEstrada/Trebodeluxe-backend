const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function investigateVarianteNegraIssue() {
    try {
        console.log('🔍 Investigando estructura real de la base de datos...\n');
        
        // 1. Verificar estructura de tabla productos
        console.log('1️⃣ Verificando estructura tabla PRODUCTOS:');
        const productosStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'productos'
            ORDER BY ordinal_position;
        `);
        console.table(productosStructure.rows);
        
        // 2. Ver todas las tablas relacionadas
        console.log('\n2️⃣ Verificando todas las tablas del esquema:');
        const allTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.table(allTables.rows);
        
        // 3. Datos básicos del producto 5
        console.log('\n3️⃣ Datos básicos del producto 5:');
        const productBasic = await pool.query(`
            SELECT * FROM productos WHERE id_producto = 5;
        `);
        console.table(productBasic.rows);
        
        // 4. Variantes del producto 5
        console.log('\n4️⃣ Variantes del producto 5:');
        const variantes = await pool.query(`
            SELECT * FROM variantes WHERE id_producto = 5 ORDER BY id_variante;
        `);
        console.table(variantes.rows);
        
        // 5. Stock de todas las variantes del producto 5
        console.log('\n5️⃣ Stock del producto 5:');
        const stock = await pool.query(`
            SELECT 
                s.*,
                v.nombre as variante_nombre,
                t.nombre_talla
            FROM stock s
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            WHERE s.id_producto = 5
            ORDER BY s.id_variante, s.id_talla;
        `);
        console.table(stock.rows);
        
        // 6. Imágenes de las variantes del producto 5
        console.log('\n6️⃣ Imágenes de variantes del producto 5:');
        const imagenes = await pool.query(`
            SELECT 
                iv.*,
                v.nombre as variante_nombre
            FROM imagenes_variante iv
            LEFT JOIN variantes v ON iv.id_variante = v.id_variante
            WHERE v.id_producto = 5
            ORDER BY iv.id_variante, iv.orden;
        `);
        console.table(imagenes.rows);
        
        // 7. Análisis específico de la variante negra
        console.log('\n7️⃣ Análisis específico de variante NEGRA:');
        
        const negraVariante = variantes.rows.find(v => v.nombre.toLowerCase().includes('negra'));
        
        if (negraVariante) {
            console.log(`\n📦 Variante negra encontrada - ID: ${negraVariante.id_variante}`);
            console.log(`   Nombre: ${negraVariante.nombre}`);
            console.log(`   Activa: ${negraVariante.activo}`);
            console.log(`   Fecha creación: ${negraVariante.fecha_creacion}`);
            
            // Stock de la variante negra
            const negraStock = stock.rows.filter(s => s.id_variante === negraVariante.id_variante);
            console.log(`\n📊 Stock de variante negra (${negraStock.length} registros):`);
            console.table(negraStock);
            
            // Imágenes de la variante negra
            const negraImagenes = imagenes.rows.filter(i => i.id_variante === negraVariante.id_variante);
            console.log(`\n🖼️ Imágenes de variante negra (${negraImagenes.length} registros):`);
            console.table(negraImagenes);
            
            // Criterios de disponibilidad
            const tieneStock = negraStock.some(s => s.cantidad > 0);
            const tienePrecios = negraStock.some(s => parseFloat(s.precio) > 0);
            const tieneImagenes = negraImagenes.length > 0;
            
            console.log('\n✅ Criterios de disponibilidad:');
            console.log(`   Variante activa: ${negraVariante.activo ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Tiene stock > 0: ${tieneStock ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Tiene precios > 0: ${tienePrecios ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Tiene imágenes: ${tieneImagenes ? '✅ SÍ' : '❌ NO'}`);
            
            // Diagnóstico
            const problemas = [];
            if (!negraVariante.activo) problemas.push('Variante marcada como inactiva');
            if (!tieneStock) problemas.push('No tiene stock disponible');
            if (!tienePrecios) problemas.push('No tiene precios válidos');
            if (!tieneImagenes) problemas.push('No tiene imágenes');
            
            if (problemas.length > 0) {
                console.log('\n🚨 PROBLEMAS IDENTIFICADOS:');
                problemas.forEach(p => console.log(`   ❌ ${p}`));
                
                console.log('\n🔧 SOLUCIONES PROPUESTAS:');
                if (!negraVariante.activo) {
                    console.log(`   1. Activar variante: UPDATE variantes SET activo = true WHERE id_variante = ${negraVariante.id_variante};`);
                }
                if (!tieneStock) {
                    console.log(`   2. Agregar stock: UPDATE stock SET cantidad = [CANTIDAD] WHERE id_variante = ${negraVariante.id_variante};`);
                }
                if (!tienePrecios) {
                    console.log(`   3. Agregar precios: UPDATE stock SET precio = [PRECIO] WHERE id_variante = ${negraVariante.id_variante};`);
                }
                if (!tieneImagenes) {
                    console.log(`   4. Agregar imágenes: INSERT INTO imagenes_variante (id_variante, url, public_id, orden) VALUES (${negraVariante.id_variante}, '[URL]', '[PUBLIC_ID]', 1);`);
                }
            } else {
                console.log('\n✅ No se identifican problemas con la variante negra');
                console.log('🔍 El problema podría estar en el código del frontend o backend');
            }
            
        } else {
            console.log('\n❌ No se encontró variante negra en el producto 5');
            console.log('📋 Variantes disponibles:');
            variantes.rows.forEach(v => {
                console.log(`   - ID ${v.id_variante}: ${v.nombre} (activa: ${v.activo})`);
            });
        }
        
        // 8. Verificar cómo el backend construye la respuesta
        console.log('\n8️⃣ Simulando construcción de respuesta del backend:');
        
        const backendSimulation = variantes.rows.map(variante => {
            const varianteStock = stock.rows.filter(s => s.id_variante === variante.id_variante);
            const varianteImagenes = imagenes.rows.filter(i => i.id_variante === variante.id_variante);
            
            const stockTotal = varianteStock.reduce((sum, s) => sum + s.cantidad, 0);
            const precioMinimo = varianteStock.length > 0 ? 
                Math.min(...varianteStock.map(s => parseFloat(s.precio)).filter(p => p > 0)) : 0;
            const disponible = variante.activo && stockTotal > 0 && precioMinimo > 0;
            
            return {
                id_variante: variante.id_variante,
                nombre: variante.nombre,
                activo: variante.activo,
                stock_total: stockTotal,
                precio: precioMinimo,
                disponible: disponible,
                imagenes_count: varianteImagenes.length,
                tallas_con_stock: varianteStock.filter(s => s.cantidad > 0).length
            };
        });
        
        console.table(backendSimulation);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

investigateVarianteNegraIssue();
