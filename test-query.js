// Test query directo para verificar porcentaje
const db = require('./src/config/db');

async function testDirectQuery() {
  try {
    console.log('🧪 Testing direct SQL query...');
    
    const query = `
      SELECT 
        p.id_promocion,
        p.nombre,
        p.tipo,
        pp.porcentaje_descuento,
        COALESCE(pp.porcentaje_descuento, 0) as porcentaje_coalesced
      FROM promociones p
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      WHERE p.nombre = 'ea'
    `;
    
    const result = await db.query(query);
    
    console.log('✅ Query result:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // También probemos el query completo de getAll para la misma promoción
    const queryCompleto = `
      SELECT 
        p.id_promocion,
        p.nombre,
        p.tipo,
        p.fecha_inicio,
        p.fecha_fin,
        p.activo,
        p.uso_maximo,
        p.veces_usado,
        COALESCE(pp.porcentaje_descuento, 0) as porcentaje,
        CASE 
          WHEN p.tipo = 'x_por_y' THEN 
            json_build_object(
              'cantidad_comprada', pxy.cantidad_comprada,
              'cantidad_pagada', pxy.cantidad_pagrada
            )
          WHEN p.tipo = 'porcentaje' THEN
            json_build_object('porcentaje', COALESCE(pp.porcentaje_descuento, 0))
          WHEN p.tipo = 'codigo' THEN
            json_build_object(
              'codigo', pc.codigo,
              'descuento', pc.descuento,
              'tipo_descuento', pc.tipo_descuento
            )
        END as detalles
      FROM promociones p
      LEFT JOIN promo_x_por_y pxy ON p.id_promocion = pxy.id_promocion
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      LEFT JOIN promo_codigo pc ON p.id_promocion = pc.id_promocion
      WHERE p.nombre = 'ea'
    `;
    
    console.log('🧪 Testing full query...');
    const result2 = await db.query(queryCompleto);
    
    console.log('✅ Full query result:');
    console.log(JSON.stringify(result2.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testDirectQuery();
