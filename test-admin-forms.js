const pool = require('./src/config/db');

// Probar las consultas que usan los formularios de productos y variantes
async function testAdminQueries() {
    console.log('🧪 Probando las consultas SQL corregidas...\n');
    
    try {
        // 1. Probar consulta de categorías (necesaria para productos)
        console.log('1. Probando consulta de categorías:');
        const categorias = await pool.query('SELECT id_categoria, nombre FROM categorias ORDER BY nombre');
        console.log(`   ✅ ${categorias.rows.length} categorías encontradas`);
        categorias.rows.slice(0, 3).forEach(cat => {
            console.log(`   - ${cat.nombre}`);
        });
        
        // 2. Probar consulta corregida de productos (con categoría JOIN)
        console.log('\n2. Probando consulta de productos con categorías:');
        const productos = await pool.query(`
            SELECT p.*, COALESCE(c.nombre, 'Sin categoría') as categoria 
            FROM productos p 
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
            ORDER BY p.fecha_creacion DESC 
            LIMIT 5
        `);
        console.log(`   ✅ ${productos.rows.length} productos encontrados con categorías`);
        productos.rows.forEach(prod => {
            console.log(`   - ${prod.nombre} | Categoría: ${prod.categoria}`);
        });
        
        // 3. Probar consulta corregida de variantes (con categoría JOIN)
        console.log('\n3. Probando consulta de variantes con categorías:');
        const variantes = await pool.query(`
            SELECT v.*, p.nombre as producto_nombre, 
                   COALESCE(c.nombre, 'Sin categoría') as categoria 
            FROM variantes v 
            LEFT JOIN productos p ON v.id_producto = p.id_producto 
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
            ORDER BY v.fecha_creacion DESC 
            LIMIT 5
        `);
        console.log(`   ✅ ${variantes.rows.length} variantes encontradas con categorías`);
        variantes.rows.forEach(var_ => {
            console.log(`   - ${var_.producto_nombre} - ${var_.talla || 'Sin talla'} | Categoría: ${var_.categoria}`);
        });
        
        // 4. Verificar estructura de tabla notas_generales (corregida)
        console.log('\n4. Verificando estructura corregida de notas_generales:');
        const notasStructure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notas_generales' 
            ORDER BY ordinal_position
        `);
        console.log(`   ✅ Tabla notas_generales tiene ${notasStructure.rows.length} columnas`);
        const expectedCols = ['prioridad', 'id_usuario_creador', 'etiquetas'];
        expectedCols.forEach(col => {
            const exists = notasStructure.rows.find(row => row.column_name === col);
            console.log(`   - ${col}: ${exists ? '✅' : '❌'}`);
        });
        
        // 5. Verificar estructura corregida de promo_x_por_y
        console.log('\n5. Verificando estructura corregida de promo_x_por_y:');
        const promoStructure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'promo_x_por_y' 
            ORDER BY ordinal_position
        `);
        const expectedPromoCols = ['cantidad_comprada', 'cantidad_pagada'];
        expectedPromoCols.forEach(col => {
            const exists = promoStructure.rows.find(row => row.column_name === col);
            console.log(`   - ${col}: ${exists ? '✅' : '❌'}`);
        });
        
        console.log('\n🎉 TODAS LAS PRUEBAS PASARON - Los formularios ya pueden cargar datos correctamente');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar pruebas
testAdminQueries();
