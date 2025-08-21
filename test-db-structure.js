// test-db-structure.js - Script para verificar estructura de promociones en BD

const db = require('./src/config/db');

async function testDatabaseStructure() {
  try {
    console.log('🔍 Verificando estructura de base de datos...');
    
    // Verificar si existen las tablas de promociones
    console.log('\n1. Verificando existencia de tablas:');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'promo%'
        OR table_name = 'promociones'
      ORDER BY table_name;
    `;
    
    const tablesResult = await db.query(tablesQuery);
    console.log('📋 Tablas encontradas:', tablesResult.rows);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No se encontraron tablas de promociones');
      return;
    }
    
    // Verificar estructura de la tabla promociones
    console.log('\n2. Estructura de tabla "promociones":');
    const promocionesStructure = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'promociones' 
      ORDER BY ordinal_position;
    `;
    
    const promocionesResult = await db.query(promocionesStructure);
    console.log('🏗️ Columnas de promociones:', promocionesResult.rows);
    
    // Verificar estructura de promo_porcentaje si existe
    console.log('\n3. Estructura de tabla "promo_porcentaje":');
    const promoPortcentajeStructure = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'promo_porcentaje' 
      ORDER BY ordinal_position;
    `;
    
    const promoPortcentajeResult = await db.query(promoPortcentajeStructure);
    if (promoPortcentajeResult.rows.length > 0) {
      console.log('🏗️ Columnas de promo_porcentaje:', promoPortcentajeResult.rows);
    } else {
      console.log('❌ Tabla promo_porcentaje no existe');
    }
    
    // Probar una consulta simple de promociones
    console.log('\n4. Probando consulta básica de promociones:');
    const basicQuery = 'SELECT * FROM promociones LIMIT 5';
    const basicResult = await db.query(basicQuery);
    console.log('📊 Datos de promociones (básico):', basicResult.rows);
    
    // Intentar la consulta problemática pero simplificada
    console.log('\n5. Probando consulta con JOIN (simplificada):');
    try {
      const joinQuery = `
        SELECT p.*, pp.porcentaje
        FROM promociones p
        LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
        LIMIT 3
      `;
      const joinResult = await db.query(joinQuery);
      console.log('✅ JOIN exitoso:', joinResult.rows);
    } catch (joinError) {
      console.log('❌ Error en JOIN:', joinError.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    // Cerrar conexión
    await db.end();
    process.exit(0);
  }
}

console.log('🚀 Iniciando verificación de estructura de BD...');
testDatabaseStructure();
