// Script para corregir promoción "ea" insertando registro faltante en promo_porcentaje
const db = require('./src/config/db');

async function fixPromocionEa() {
  const client = await db.connect();
  
  try {
    console.log('🔧 Corrigiendo promoción "ea"...');
    
    // Verificar la promoción actual
    const checkQuery = `
      SELECT 
        p.id_promocion, p.nombre, p.tipo,
        pp.porcentaje_descuento
      FROM promociones p
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      WHERE p.nombre = 'ea'
    `;
    
    const checkResult = await client.query(checkQuery);
    console.log('📊 Estado actual:', JSON.stringify(checkResult.rows, null, 2));
    
    if (checkResult.rows.length > 0) {
      const promo = checkResult.rows[0];
      
      if (!promo.porcentaje_descuento) {
        console.log('⚠️ Falta registro en promo_porcentaje. Insertando...');
        
        // Insertar el registro con 30% de descuento
        const insertQuery = `
          INSERT INTO promo_porcentaje (id_promocion, porcentaje_descuento) 
          VALUES ($1, $2)
          ON CONFLICT (id_promocion) 
          DO UPDATE SET porcentaje_descuento = $2
        `;
        
        await client.query(insertQuery, [promo.id_promocion, 30.00]);
        console.log('✅ Registro insertado con 30% de descuento');
        
        // Verificar que se insertó correctamente
        const verifyResult = await client.query(checkQuery);
        console.log('🔍 Verificación post-inserción:', JSON.stringify(verifyResult.rows, null, 2));
      } else {
        console.log('ℹ️ La promoción ya tiene porcentaje_descuento:', promo.porcentaje_descuento);
      }
    } else {
      console.log('❌ No se encontró la promoción "ea"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
  
  process.exit(0);
}

fixPromocionEa();
