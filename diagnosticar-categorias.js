const db = require('./src/config/db');

async function diagnosticarCategorias() {
  try {
    console.log('🔍 Iniciando diagnóstico de categorías...\n');

    // 1. Verificar conexión a la base de datos
    console.log('1️⃣ Verificando conexión a base de datos...');
    const connectionTest = await db.checkConnection();
    if (connectionTest.connected) {
      console.log('✅ Conexión a base de datos: OK');
    } else {
      console.log('❌ Conexión a base de datos: FALLO');
      return;
    }

    // 2. Verificar si existe la tabla categorias
    console.log('\n2️⃣ Verificando existencia de tabla categorias...');
    const tableExists = await db.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'categorias'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ Tabla categorias: EXISTE');
    } else {
      console.log('❌ Tabla categorias: NO EXISTE');
      return;
    }

    // 3. Contar categorías en la tabla
    console.log('\n3️⃣ Contando categorías en la tabla...');
    const countResult = await db.pool.query('SELECT COUNT(*) as total FROM categorias;');
    const totalCategorias = countResult.rows[0].total;
    console.log(`📊 Total de categorías: ${totalCategorias}`);

    // 4. Verificar estructura de la tabla
    console.log('\n4️⃣ Verificando estructura de tabla categorias...');
    const structure = await db.pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas de la tabla categorias:');
    structure.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 5. Verificar columnas SkyDropX específicamente
    console.log('\n5️⃣ Verificando columnas SkyDropX...');
    const skyDropColumns = await db.pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categorias' 
        AND column_name IN ('alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion')
    `);
    
    const skydropExisting = skyDropColumns.rows.map(row => row.column_name);
    const skydropNeeded = ['alto_cm', 'largo_cm', 'ancho_cm', 'peso_kg', 'nivel_compresion'];
    const skydropMissing = skydropNeeded.filter(col => !skydropExisting.includes(col));
    
    console.log('✅ Columnas SkyDropX presentes:', skydropExisting);
    if (skydropMissing.length > 0) {
      console.log('❌ Columnas SkyDropX faltantes:', skydropMissing);
    } else {
      console.log('✅ Todas las columnas SkyDropX están presentes');
    }

    // 6. Mostrar algunas categorías de ejemplo
    if (totalCategorias > 0) {
      console.log('\n6️⃣ Mostrando categorías existentes...');
      const sampleCategories = await db.pool.query(`
        SELECT id_categoria, nombre, activo 
        FROM categorias 
        ORDER BY id_categoria 
        LIMIT 5;
      `);
      
      console.log('📋 Categorías de ejemplo:');
      sampleCategories.rows.forEach(cat => {
        console.log(`   - ID: ${cat.id_categoria}, Nombre: ${cat.nombre}, Activo: ${cat.activo}`);
      });
    }

    // 7. Probar la consulta que usa el endpoint
    console.log('\n7️⃣ Probando consulta del endpoint admin...');
    try {
      const testQuery = `
        SELECT 
          id_categoria,
          nombre,
          descripcion,
          activo,
          orden,
          fecha_creacion,
          fecha_actualizacion,
          ${skydropExisting.includes('alto_cm') ? 'alto_cm' : '0 as alto_cm'},
          ${skydropExisting.includes('largo_cm') ? 'largo_cm' : '0 as largo_cm'},
          ${skydropExisting.includes('ancho_cm') ? 'ancho_cm' : '0 as ancho_cm'},
          ${skydropExisting.includes('peso_kg') ? 'peso_kg' : '0 as peso_kg'},
          ${skydropExisting.includes('nivel_compresion') ? 'nivel_compresion' : "'baja' as nivel_compresion"},
          (SELECT COUNT(*) FROM productos WHERE id_categoria = categorias.id_categoria) as productos_count
        FROM categorias 
        ORDER BY orden ASC, nombre ASC
        LIMIT 3;
      `;

      const queryResult = await db.pool.query(testQuery);
      console.log('✅ Consulta del endpoint: EXITOSA');
      console.log(`📊 Categorías recuperadas: ${queryResult.rows.length}`);
      
      if (queryResult.rows.length > 0) {
        console.log('📋 Primera categoría de prueba:');
        const firstCat = queryResult.rows[0];
        console.log(`   - ID: ${firstCat.id_categoria}`);
        console.log(`   - Nombre: ${firstCat.nombre}`);
        console.log(`   - Activo: ${firstCat.activo}`);
        console.log(`   - SkyDropX Data: alto=${firstCat.alto_cm}, largo=${firstCat.largo_cm}, ancho=${firstCat.ancho_cm}`);
      }

    } catch (queryError) {
      console.log('❌ Error en consulta del endpoint:', queryError.message);
    }

    console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
    console.log('=====================================');
    console.log(`✅ Base de datos: Conectada`);
    console.log(`✅ Tabla categorias: Existe`);
    console.log(`📊 Total categorías: ${totalCategorias}`);
    console.log(`🔧 Columnas SkyDropX: ${skydropMissing.length > 0 ? `${skydropMissing.length} faltantes` : 'Completas'}`);
    
    if (skydropMissing.length > 0) {
      console.log('\n⚠️ ACCIÓN REQUERIDA: Ejecutar migración SkyDropX');
      console.log('   POST /api/categorias/admin/apply-skydropx-migration');
    } else {
      console.log('\n✅ ESTRUCTURA COMPLETA: El problema puede ser de autenticación o frontend');
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  }
  
  process.exit(0);
}

diagnosticarCategorias();
