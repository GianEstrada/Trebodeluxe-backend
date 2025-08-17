const { pool } = require('./src/config/db');

async function testPromotionsSearch() {
  try {
    console.log('=== Test: Búsqueda de Promociones ===');
    
    // Test 1: Búsqueda por nombre
    console.log('\n1. Búsqueda por término "descuento"...');
    const searchTerm = '%descuento%';
    
    const searchQuery = `
      SELECT 
        p.*,
        px.cantidad_comprada,
        px.cantidad_pagada,
        pp.porcentaje_descuento,
        pp.monto_minimo,
        pc.codigo,
        pc.usos_maximos,
        pc.usos_actuales,
        COUNT(*) OVER() as total_count
      FROM promociones p
      LEFT JOIN promo_x_por_y px ON p.id_promocion = px.id_promocion
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
      WHERE (LOWER(p.nombre) LIKE LOWER($1) OR LOWER(pc.codigo) LIKE LOWER($2))
      ORDER BY p.id_promocion DESC
      LIMIT 10 OFFSET 0
    `;
    
    const searchResult = await pool.query(searchQuery, [searchTerm, searchTerm]);
    console.log(`   Promociones encontradas: ${searchResult.rows.length}`);
    searchResult.rows.forEach(p => {
      console.log(`   ✓ ${p.nombre} (${p.tipo}) - ${p.activo ? 'Activa' : 'Inactiva'}`);
    });

    // Test 2: Filtro solo activas
    console.log('\n2. Solo promociones activas...');
    
    const activeQuery = `
      SELECT 
        p.*,
        px.cantidad_comprada,
        px.cantidad_pagada,
        pp.porcentaje_descuento,
        pp.monto_minimo,
        pc.codigo,
        pc.usos_maximos,
        pc.usos_actuales,
        COUNT(*) OVER() as total_count
      FROM promociones p
      LEFT JOIN promo_x_por_y px ON p.id_promocion = px.id_promocion
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
      WHERE p.activo = $1
      ORDER BY p.id_promocion DESC
      LIMIT 10 OFFSET 0
    `;
    
    const activeResult = await pool.query(activeQuery, [true]);
    console.log(`   Promociones activas: ${activeResult.rows.length}`);
    activeResult.rows.forEach(p => {
      console.log(`   ✓ ${p.nombre} (${p.tipo})`);
    });

    // Test 3: Todas las promociones (incluye inactivas)
    console.log('\n3. Todas las promociones...');
    
    const allQuery = `
      SELECT 
        p.*,
        px.cantidad_comprada,
        px.cantidad_pagada,
        pp.porcentaje_descuento,
        pp.monto_minimo,
        pc.codigo,
        pc.usos_maximos,
        pc.usos_actuales,
        COUNT(*) OVER() as total_count
      FROM promociones p
      LEFT JOIN promo_x_por_y px ON p.id_promocion = px.id_promocion
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
      ORDER BY p.id_promocion DESC
      LIMIT 10 OFFSET 0
    `;
    
    const allResult = await pool.query(allQuery);
    console.log(`   Total de promociones: ${allResult.rows.length}`);
    allResult.rows.forEach(p => {
      console.log(`   ✓ ${p.nombre} (${p.tipo}) - ${p.activo ? 'Activa' : 'Inactiva'}`);
    });

    // Test 4: Paginación
    console.log('\n4. Test de paginación...');
    const page1 = await pool.query(allQuery.replace('OFFSET 0', 'OFFSET 0'));
    const page2 = await pool.query(allQuery.replace('OFFSET 0', 'OFFSET 10'));
    
    console.log(`   Página 1: ${page1.rows.length} promociones`);
    console.log(`   Página 2: ${page2.rows.length} promociones`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

testPromotionsSearch();
