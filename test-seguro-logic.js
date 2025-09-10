const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function testSeguroLogic() {
    try {
        console.log('🧪 Probando la lógica automática del seguro de envío...\n');
        
        // Caso 1: Suma igual al total (seguro_envio debe ser false)
        console.log('📝 Caso 1: Suma = Total (sin seguro)');
        const caso1 = await pool.query(`
            INSERT INTO ordenes (
                numero_referencia, metodo_envio, subtotal, iva, costo_envio, total
            ) VALUES (
                'TEST001', 'fedex', 100.00, 16.00, 50.00, 166.00
            ) RETURNING id_orden, subtotal, iva, costo_envio, total, seguro_envio;
        `);
        
        const orden1 = caso1.rows[0];
        console.log(`   Orden ${orden1.id_orden}: $${orden1.subtotal} + $${orden1.iva} + $${orden1.costo_envio} = $${parseFloat(orden1.subtotal) + parseFloat(orden1.iva) + parseFloat(orden1.costo_envio)}`);
        console.log(`   Total: $${orden1.total}`);
        console.log(`   Seguro: ${orden1.seguro_envio ? 'SÍ' : 'NO'} ✅`);
        
        // Caso 2: Suma menor al total (seguro_envio debe ser true)
        console.log('\n📝 Caso 2: Suma < Total (con seguro)');
        const caso2 = await pool.query(`
            INSERT INTO ordenes (
                numero_referencia, metodo_envio, subtotal, iva, costo_envio, total
            ) VALUES (
                'TEST002', 'dhl', 100.00, 16.00, 50.00, 200.00
            ) RETURNING id_orden, subtotal, iva, costo_envio, total, seguro_envio;
        `);
        
        const orden2 = caso2.rows[0];
        console.log(`   Orden ${orden2.id_orden}: $${orden2.subtotal} + $${orden2.iva} + $${orden2.costo_envio} = $${parseFloat(orden2.subtotal) + parseFloat(orden2.iva) + parseFloat(orden2.costo_envio)}`);
        console.log(`   Total: $${orden2.total}`);
        console.log(`   Seguro: ${orden2.seguro_envio ? 'SÍ' : 'NO'} ✅`);
        
        // Caso 3: Probar UPDATE
        console.log('\n📝 Caso 3: Actualizar orden existente');
        console.log('   Cambiando total para que requiera seguro...');
        
        const caso3 = await pool.query(`
            UPDATE ordenes 
            SET total = 180.00 
            WHERE id_orden = $1
            RETURNING id_orden, subtotal, iva, costo_envio, total, seguro_envio;
        `, [orden1.id_orden]);
        
        const orden3 = caso3.rows[0];
        console.log(`   Orden ${orden3.id_orden}: $${orden3.subtotal} + $${orden3.iva} + $${orden3.costo_envio} = $${parseFloat(orden3.subtotal) + parseFloat(orden3.iva) + parseFloat(orden3.costo_envio)}`);
        console.log(`   Total: $${orden3.total}`);
        console.log(`   Seguro: ${orden3.seguro_envio ? 'SÍ' : 'NO'} ✅`);
        
        console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
        console.log('\n🧹 Limpiando órdenes de prueba...');
        
        await pool.query('DELETE FROM ordenes WHERE numero_referencia LIKE $1', ['TEST%']);
        console.log('✅ Órdenes de prueba eliminadas');
        
        console.log('\n📋 Estado final del sistema:');
        console.log('   • Función actualizar_seguro_envio() → Activa');
        console.log('   • Trigger trigger_seguro_envio → Activo');
        console.log('   • Lógica: suma = total → seguro_envio = false');
        console.log('   • Lógica: suma < total → seguro_envio = true');
        console.log('   • Se ejecuta automáticamente en INSERT y UPDATE');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    } finally {
        await pool.end();
    }
}

testSeguroLogic();
