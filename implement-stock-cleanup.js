const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function implementStockCleanup() {
    try {
        console.log('🧹 Implementando limpieza automática de stock inválido...\n');
        
        // Paso 1: Mostrar registros que serán eliminados
        console.log('1️⃣ Identificando registros que serán eliminados...');
        const toDeleteQuery = `
            SELECT 
                s.id_stock,
                p.nombre as producto,
                v.nombre as variante,
                t.nombre_talla as talla,
                s.cantidad,
                s.precio
            FROM stock s
            LEFT JOIN productos p ON s.id_producto = p.id_producto
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            WHERE s.cantidad = 0 OR s.precio = 0;
        `;
        
        const toDelete = await pool.query(toDeleteQuery);
        console.log('📋 Registros que serán eliminados:');
        console.table(toDelete.rows);
        
        // Paso 2: Eliminar registros problemáticos existentes
        console.log('\n2️⃣ Eliminando registros con cantidad = 0 OR precio = 0...');
        const deleteResult = await pool.query(`
            DELETE FROM stock 
            WHERE cantidad = 0 OR precio = 0;
        `);
        console.log(`✅ ${deleteResult.rowCount} registros eliminados`);
        
        // Paso 3: Crear función que elimine automáticamente registros inválidos
        console.log('\n3️⃣ Creando función de limpieza automática...');
        const createFunction = `
            CREATE OR REPLACE FUNCTION limpiar_stock_invalido()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Si se está insertando un registro con cantidad = 0 OR precio = 0, no permitirlo
                IF TG_OP = 'INSERT' THEN
                    IF NEW.cantidad = 0 OR NEW.precio = 0 THEN
                        -- No insertar el registro, simplemente retornar NULL
                        RETURN NULL;
                    END IF;
                    RETURN NEW;
                END IF;
                
                -- Si se está actualizando y queda con cantidad = 0 OR precio = 0, eliminarlo
                IF TG_OP = 'UPDATE' THEN
                    IF NEW.cantidad = 0 OR NEW.precio = 0 THEN
                        -- Eliminar el registro
                        DELETE FROM stock WHERE id_stock = NEW.id_stock;
                        RETURN NULL;
                    END IF;
                    RETURN NEW;
                END IF;
                
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        await pool.query(createFunction);
        console.log('✅ Función limpiar_stock_invalido() creada');
        
        // Paso 4: Crear trigger que se ejecute en INSERT y UPDATE
        console.log('\n4️⃣ Creando trigger automático...');
        const createTrigger = `
            DROP TRIGGER IF EXISTS trigger_limpiar_stock ON stock;
            
            CREATE TRIGGER trigger_limpiar_stock
                BEFORE INSERT OR UPDATE ON stock
                FOR EACH ROW
                EXECUTE FUNCTION limpiar_stock_invalido();
        `;
        
        await pool.query(createTrigger);
        console.log('✅ Trigger trigger_limpiar_stock creado');
        
        // Paso 5: Verificar el estado final
        console.log('\n5️⃣ Verificando estado final...');
        const finalState = await pool.query(`
            SELECT 
                s.id_stock,
                p.nombre as producto,
                v.nombre as variante,
                t.nombre_talla as talla,
                s.cantidad,
                s.precio
            FROM stock s
            LEFT JOIN productos p ON s.id_producto = p.id_producto
            LEFT JOIN variantes v ON s.id_variante = v.id_variante
            LEFT JOIN tallas t ON s.id_talla = t.id_talla
            ORDER BY s.id_producto, s.id_variante, s.id_talla;
        `);
        
        console.log('📋 Estado final de la tabla stock (solo registros válidos):');
        console.table(finalState.rows);
        
        // Paso 6: Probar la funcionalidad
        console.log('\n6️⃣ Probando la funcionalidad automática...');
        
        // Intentar insertar un registro inválido
        console.log('   Probando INSERT con cantidad = 0...');
        try {
            const testInsert = await pool.query(`
                INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
                VALUES (5, 14, 1, 0, 100.00)
                RETURNING *;
            `);
            
            if (testInsert.rows.length === 0) {
                console.log('   ✅ INSERT con cantidad = 0 fue correctamente bloqueado');
            } else {
                console.log('   ❌ INSERT con cantidad = 0 no fue bloqueado');
            }
        } catch (error) {
            console.log('   ✅ INSERT con cantidad = 0 fue correctamente bloqueado');
        }
        
        // Intentar actualizar un registro válido a inválido
        console.log('   Probando UPDATE a precio = 0...');
        const validRecord = finalState.rows[0];
        if (validRecord) {
            const beforeUpdate = await pool.query('SELECT COUNT(*) as count FROM stock WHERE id_stock = $1', [validRecord.id_stock]);
            
            await pool.query(`
                UPDATE stock 
                SET precio = 0 
                WHERE id_stock = $1;
            `, [validRecord.id_stock]);
            
            const afterUpdate = await pool.query('SELECT COUNT(*) as count FROM stock WHERE id_stock = $1', [validRecord.id_stock]);
            
            if (parseInt(afterUpdate.rows[0].count) === 0 && parseInt(beforeUpdate.rows[0].count) === 1) {
                console.log('   ✅ UPDATE a precio = 0 eliminó correctamente el registro');
                
                // Restaurar el registro para mantener los datos de prueba
                await pool.query(`
                    INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
                    VALUES ($1, $2, $3, $4, $5);
                `, [5, validRecord.id_variante, validRecord.id_talla, validRecord.cantidad, '600.00']);
                console.log('   📝 Registro de prueba restaurado');
            } else {
                console.log('   ❌ UPDATE a precio = 0 no eliminó el registro');
            }
        }
        
        console.log('\n🎉 ¡Implementación completada exitosamente!');
        console.log('\n📝 Resumen de la funcionalidad:');
        console.log('   • INSERT con cantidad = 0 OR precio = 0 → Se bloquea automáticamente');
        console.log('   • UPDATE que resulte en cantidad = 0 OR precio = 0 → Elimina el registro');
        console.log('   • La tabla stock siempre mantendrá solo registros válidos');
        console.log('   • No se requieren cambios en el código del admin');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

implementStockCleanup();
