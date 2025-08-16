// Script para verificar la estructura actual de las tablas
const { pool } = require('./src/config/db');

async function verificarEstructuraTablas() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estructura de tablas...');
    
    // 1. Verificar si existe tabla notas_generales
    const notasExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notas_generales'
      );
    `);
    
    console.log('📝 Tabla notas_generales existe:', notasExists.rows[0].exists);
    
    if (notasExists.rows[0].exists) {
      // Obtener columnas de notas_generales
      const notasColumns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'notas_generales' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Columnas en notas_generales:');
      notasColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    }
    
    // 2. Verificar tabla promociones
    const promosExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'promociones'
      );
    `);
    
    console.log('\n🎯 Tabla promociones existe:', promosExists.rows[0].exists);
    
    if (promosExists.rows[0].exists) {
      const promosColumns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'promociones' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Columnas en promociones:');
      promosColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    }
    
    // 3. Verificar tabla promo_x_por_y
    const promoXPorYExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'promo_x_por_y'
      );
    `);
    
    console.log('\n🔄 Tabla promo_x_por_y existe:', promoXPorYExists.rows[0].exists);
    
    if (promoXPorYExists.rows[0].exists) {
      const promoXColumns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'promo_x_por_y' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Columnas en promo_x_por_y:');
      promoXColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar verificación
verificarEstructuraTablas()
  .then(() => {
    console.log('🎉 Verificación finalizada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
