const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function insertTestPromotions() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Insertando promociones de prueba...');
    
    // 1. Promoción general del 15%
    console.log('1️⃣ Creando promoción general 15%...');
    const promocion1 = await client.query(`
      INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, activo) 
      VALUES ('Promoción General 15%', 'porcentaje', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', true)
      RETURNING id_promocion
    `);
    const promo1Id = promocion1.rows[0].id_promocion;
    
    await client.query(`INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, 15.00)`, [promo1Id]);
    await client.query(`INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo) VALUES ($1, 'todos')`, [promo1Id]);
    
    // 2. Promoción específica para Hoodies del 25%
    console.log('2️⃣ Creando promoción Hoodies 25%...');
    const promocion2 = await client.query(`
      INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, activo) 
      VALUES ('Super Hoodies 25%', 'porcentaje', NOW() - INTERVAL '1 day', NOW() + INTERVAL '15 days', true)
      RETURNING id_promocion
    `);
    const promo2Id = promocion2.rows[0].id_promocion;
    
    await client.query(`INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, 25.00)`, [promo2Id]);
    await client.query(`INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_categoria) VALUES ($1, 'categoria', $2)`, [promo2Id, 'Hoodie']);
    
    // 3. Promoción específica para el producto ID 2 del 30%
    console.log('3️⃣ Creando promoción producto específico 30%...');
    const promocion3 = await client.query(`
      INSERT INTO promociones (nombre, tipo, fecha_inicio, fecha_fin, activo) 
      VALUES ('Producto Especial 30%', 'porcentaje', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', true)
      RETURNING id_promocion
    `);
    const promo3Id = promocion3.rows[0].id_promocion;
    
    await client.query(`INSERT INTO promo_porcentaje (id_promocion, porcentaje) VALUES ($1, 30.00)`, [promo3Id]);
    await client.query(`INSERT INTO promocion_aplicacion (id_promocion, tipo_objetivo, id_producto) VALUES ($1, 'producto', $2)`, [promo3Id, 2]);
    
    // Verificar que se insertaron correctamente
    console.log('🔍 Verificando promociones insertadas...');
    const verification = await client.query(`
      SELECT 
        p.id_promocion,
        p.nombre,
        p.tipo,
        p.activo,
        pp.porcentaje,
        pa.tipo_objetivo,
        pa.id_categoria,
        pa.id_producto
      FROM promociones p
      LEFT JOIN promo_porcentaje pp ON p.id_promocion = pp.id_promocion
      LEFT JOIN promocion_aplicacion pa ON p.id_promocion = pa.id_promocion
      ORDER BY p.id_promocion
    `);
    
    console.log('\n✅ Promociones en la base de datos:');
    verification.rows.forEach(row => {
      console.log(`  📊 ${row.nombre}: ${row.porcentaje}% - ${row.tipo_objetivo} ${row.id_categoria || row.id_producto || ''}`);
    });
    
    console.log(`\n🎉 ¡${verification.rows.length} promociones creadas exitosamente!`);
    
  } catch (error) {
    console.error('❌ Error al insertar promociones:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  insertTestPromotions();
}

module.exports = { insertTestPromotions };
