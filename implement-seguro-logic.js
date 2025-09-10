const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function implementSeguroLogic() {
    try {
        console.log('🔧 Implementando lógica automática para seguro_envio...\n');
        
        // Crear la función que calculará el seguro_envio
        const createFunction = `
            CREATE OR REPLACE FUNCTION actualizar_seguro_envio()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Calcular si la suma de costos es igual al total
                -- Si suma = total, entonces seguro_envio = false
                -- Si suma < total, entonces seguro_envio = true
                
                NEW.seguro_envio := (NEW.subtotal + NEW.iva + NEW.costo_envio) < NEW.total;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        console.log('1️⃣ Creando función actualizar_seguro_envio()...');
        await pool.query(createFunction);
        console.log('✅ Función creada exitosamente');
        
        // Crear el trigger que se ejecutará antes de INSERT y UPDATE
        const createTrigger = `
            DROP TRIGGER IF EXISTS trigger_seguro_envio ON ordenes;
            
            CREATE TRIGGER trigger_seguro_envio
                BEFORE INSERT OR UPDATE ON ordenes
                FOR EACH ROW
                EXECUTE FUNCTION actualizar_seguro_envio();
        `;
        
        console.log('\n2️⃣ Creando trigger para actualizar automáticamente...');
        await pool.query(createTrigger);
        console.log('✅ Trigger creado exitosamente');
        
        // Actualizar registros existentes para aplicar la nueva lógica
        const updateExisting = `
            UPDATE ordenes 
            SET seguro_envio = (subtotal + iva + costo_envio) < total
            WHERE id_orden IS NOT NULL;
        `;
        
        console.log('\n3️⃣ Actualizando registros existentes...');
        const result = await pool.query(updateExisting);
        console.log(`✅ ${result.rowCount} registros actualizados`);
        
        // Verificar los resultados
        console.log('\n📊 Verificando resultados:');
        const verification = await pool.query(`
            SELECT 
                id_orden,
                numero_referencia,
                subtotal,
                iva, 
                costo_envio,
                (subtotal + iva + costo_envio) as suma_calculada,
                total,
                seguro_envio,
                CASE 
                    WHEN (subtotal + iva + costo_envio) = total THEN 'SIN SEGURO'
                    WHEN (subtotal + iva + costo_envio) < total THEN 'CON SEGURO'
                    ELSE 'ERROR'
                END as estado_seguro
            FROM ordenes 
            ORDER BY id_orden DESC 
            LIMIT 10;
        `);
        
        console.log('\n=== RESULTADOS DE LA VERIFICACIÓN ===');
        verification.rows.forEach(row => {
            console.log(`\n📦 Orden ${row.id_orden} (${row.numero_referencia}):`);
            console.log(`   Subtotal: $${row.subtotal}`);
            console.log(`   IVA: $${row.iva}`);
            console.log(`   Costo envío: $${row.costo_envio}`);
            console.log(`   Suma: $${row.suma_calculada}`);
            console.log(`   Total: $${row.total}`);
            console.log(`   Seguro envío: ${row.seguro_envio ? 'SÍ' : 'NO'}`);
            console.log(`   Estado: ${row.estado_seguro}`);
        });
        
        console.log('\n🎉 ¡Implementación completada exitosamente!');
        console.log('\n📝 Resumen de la lógica implementada:');
        console.log('   • Si suma(subtotal + iva + costo_envio) = total → seguro_envio = false');
        console.log('   • Si suma(subtotal + iva + costo_envio) < total → seguro_envio = true');
        console.log('   • Se aplica automáticamente en INSERT y UPDATE');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

implementSeguroLogic();
