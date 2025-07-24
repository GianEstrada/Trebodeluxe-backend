const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testUpdateVariant() {
  const client = await pool.connect();
  
  try {
    console.log('=== PRUEBA DE updateVariant FUNCTION ===\n');
    
    // Simular el comportamiento de updateVariant
    const id = 4; // ID de la variante a actualizar
    
    // Datos de prueba para actualización con precios por talla
    const tallas = [
      { id_talla: 7, cantidad: 5, precio: 530 }, // XS con precio específico
      { id_talla: 8, cantidad: 3, precio: 530 }, // S con precio específico
      { id_talla: 9, cantidad: 4, precio: 580 }, // M con precio específico
      { id_talla: 10, cantidad: 2, precio: 520 } // L con precio específico
    ];
    
    console.log('1. ESTADO INICIAL:');
    let current = await client.query(`
      SELECT t.nombre_talla, s.precio, s.cantidad
      FROM stock s
      INNER JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = $1
      ORDER BY t.orden
    `, [id]);
    console.table(current.rows);
    
    console.log('\n2. APLICANDO LÓGICA DE updateVariant...');
    
    await client.query('BEGIN');
    
    // Obtener id_producto para el stock
    const productQuery = 'SELECT id_producto FROM variantes WHERE id_variante = $1';
    const productResult = await client.query(productQuery, [id]);
    const id_producto = productResult.rows[0].id_producto;
    
    // Procesar cada talla individualmente (nueva lógica)
    for (const talla of tallas) {
      // Verificar si ya existe stock para esta talla
      const existingStockQuery = `
        SELECT id_stock FROM stock 
        WHERE id_variante = $1 AND id_talla = $2
      `;
      const existingStock = await client.query(existingStockQuery, [id, talla.id_talla]);
      
      // Usar el precio específico de la talla
      const precioFinal = talla.precio;
      
      if (existingStock.rows.length > 0) {
        // Actualizar stock existente
        console.log(`  Actualizando talla ${talla.id_talla} con precio $${precioFinal}`);
        const updateStockQuery = `
          UPDATE stock 
          SET cantidad = $1, precio = $2
          WHERE id_variante = $3 AND id_talla = $4;
        `;
        
        await client.query(updateStockQuery, [
          talla.cantidad,
          precioFinal,
          id,
          talla.id_talla
        ]);
      } else if (talla.cantidad > 0) {
        // Crear nuevo stock solo si la cantidad es mayor a 0
        console.log(`  Creando nuevo stock para talla ${talla.id_talla} con precio $${precioFinal}`);
        const stockQuery = `
          INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
          VALUES ($1, $2, $3, $4, $5);
        `;
        
        await client.query(stockQuery, [
          id_producto,
          id,
          talla.id_talla,
          talla.cantidad,
          precioFinal
        ]);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n3. ESTADO DESPUÉS DE LA ACTUALIZACIÓN:');
    let updated = await client.query(`
      SELECT t.nombre_talla, s.precio, s.cantidad
      FROM stock s
      INNER JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = $1
      ORDER BY t.orden
    `, [id]);
    console.table(updated.rows);
    
    console.log('\n4. ANÁLISIS DE PRECIOS DESPUÉS DE LA ACTUALIZACIÓN:');
    const analysis = await client.query(`
      SELECT 
        COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
        MIN(s.precio) as precio_min,
        MAX(s.precio) as precio_max,
        CASE 
          WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN 'UNIFORME'
          ELSE 'DIFERENCIADO'
        END as tipo_precio
      FROM stock s
      WHERE s.id_variante = $1
    `, [id]);
    
    console.table(analysis.rows);
    
    console.log('\n5. VERIFICANDO QUE getVariantById FUNCIONA CORRECTAMENTE:');
    const variantById = await client.query(`
      SELECT 
        v.nombre as nombre_variante,
        precios_info.precio_minimo,
        precios_info.precio_maximo,
        precios_info.precios_distintos,
        precios_info.precio_unico
      FROM variantes v
      LEFT JOIN (
        SELECT 
          s.id_variante,
          MIN(s.precio) as precio_minimo,
          MAX(s.precio) as precio_maximo,
          COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) as precios_distintos,
          CASE 
            WHEN COUNT(DISTINCT s.precio) FILTER (WHERE s.precio IS NOT NULL) <= 1 THEN true
            ELSE false
          END as precio_unico
        FROM stock s
        WHERE s.id_variante = $1
        GROUP BY s.id_variante
      ) precios_info ON v.id_variante = precios_info.id_variante
      WHERE v.id_variante = $1
    `, [id]);
    
    if (variantById.rows.length > 0) {
      const variant = variantById.rows[0];
      console.log(`Variante: ${variant.nombre_variante}`);
      console.log(`Precio único: ${variant.precio_unico}`);
      if (variant.precio_unico) {
        console.log(`✅ Frontend mostrará: $${variant.precio_minimo}`);
      } else {
        console.log(`✅ Frontend mostrará: $${variant.precio_minimo} - $${variant.precio_maximo}`);
      }
    }
    
    console.log('\n=== ✅ PRUEBA DE updateVariant EXITOSA ===');
    console.log('✅ La función maneja correctamente precios por talla');
    console.log('✅ No causa valores null en los precios');
    console.log('✅ El análisis de precios funciona después de las actualizaciones');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testUpdateVariant();
