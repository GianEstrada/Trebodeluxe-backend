const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkStocksStructure() {
    try {
        console.log('🔍 Analizando estructura de tablas relacionadas con stocks...\n');
        
        // Buscar tablas relacionadas con stocks/variantes
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (
                table_name LIKE '%stock%' OR 
                table_name LIKE '%variant%' OR
                table_name LIKE '%size%' OR
                table_name LIKE '%talla%' OR
                table_name LIKE '%producto%'
            )
            ORDER BY table_name;
        `;
        
        const tablesResult = await pool.query(tablesQuery);
        console.log('📋 Tablas encontradas relacionadas con stocks:');
        console.log('='.repeat(50));
        tablesResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // Analizar estructura de cada tabla relevante
        for (const tableRow of tablesResult.rows) {
            const tableName = tableRow.table_name;
            console.log(`\n🔍 Estructura de la tabla: ${tableName}`);
            console.log('='.repeat(60));
            
            const structureQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `;
            
            const structureResult = await pool.query(structureQuery, [tableName]);
            console.log('COLUMNA'.padEnd(25) + ' | ' + 'TIPO'.padEnd(15) + ' | ' + 'NULLABLE'.padEnd(10) + ' | ' + 'DEFAULT');
            console.log('-'.repeat(80));
            
            structureResult.rows.forEach(row => {
                console.log(
                    `${row.column_name.padEnd(25)} | ${row.data_type.padEnd(15)} | ${row.is_nullable.padEnd(10)} | ${row.column_default || 'NULL'}`
                );
            });
            
            // Mostrar algunos registros de ejemplo
            if (tableName.includes('stock') || tableName.includes('variant')) {
                try {
                    const sampleQuery = `SELECT * FROM ${tableName} LIMIT 5;`;
                    const sampleResult = await pool.query(sampleQuery);
                    
                    if (sampleResult.rows.length > 0) {
                        console.log(`\n📊 Registros de ejemplo en ${tableName}:`);
                        console.table(sampleResult.rows);
                    }
                } catch (error) {
                    console.log(`\n⚠️  No se pudo obtener registros de ejemplo de ${tableName}`);
                }
            }
        }
        
        // Buscar registros con stock 0 o precio 0
        console.log('\n🔍 Buscando registros problemáticos (stock=0 o precio=0)...');
        
        for (const tableRow of tablesResult.rows) {
            const tableName = tableRow.table_name;
            
            // Buscar columnas que podrían contener stock o precio
            const columnsQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 
                AND (
                    column_name LIKE '%stock%' OR 
                    column_name LIKE '%precio%' OR
                    column_name LIKE '%price%' OR
                    column_name LIKE '%cantidad%' OR
                    column_name LIKE '%qty%'
                )
            `;
            
            const columnsResult = await pool.query(columnsQuery, [tableName]);
            
            if (columnsResult.rows.length > 0) {
                console.log(`\n📋 Tabla ${tableName} - Columnas relevantes:`);
                
                for (const colRow of columnsResult.rows) {
                    const columnName = colRow.column_name;
                    
                    try {
                        const countQuery = `
                            SELECT COUNT(*) as total,
                                   COUNT(CASE WHEN ${columnName} = 0 THEN 1 END) as zeros,
                                   COUNT(CASE WHEN ${columnName} IS NULL THEN 1 END) as nulls
                            FROM ${tableName}
                        `;
                        
                        const countResult = await pool.query(countQuery);
                        const stats = countResult.rows[0];
                        
                        console.log(`  ${columnName}:`);
                        console.log(`    Total registros: ${stats.total}`);
                        console.log(`    Con valor 0: ${stats.zeros}`);
                        console.log(`    Con valor NULL: ${stats.nulls}`);
                        
                        if (parseInt(stats.zeros) > 0) {
                            console.log(`    ⚠️  Hay ${stats.zeros} registros con ${columnName} = 0`);
                        }
                        
                    } catch (error) {
                        console.log(`    Error analizando ${columnName}: ${error.message}`);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkStocksStructure();
