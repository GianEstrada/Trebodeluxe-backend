#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a/trebolux_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function migratePriceToStock() {
  console.log('🔌 Intentando conectar a la base de datos...');
  console.log('DATABASE_URL disponible:', !!process.env.DATABASE_URL);
  
  const client = await pool.connect();
  console.log('✅ Conectado a la base de datos');
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Iniciando migración de precios y categorías...');
    
    // 1. Crear tabla categorías
    console.log('📁 Creando tabla categorías...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id_categoria SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        activo BOOLEAN DEFAULT true,
        orden INTEGER DEFAULT 0,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Insertar categorías existentes de productos
    console.log('📁 Insertando categorías existentes...');
    await client.query(`
      INSERT INTO categorias (nombre, orden) 
      SELECT DISTINCT categoria, ROW_NUMBER() OVER (ORDER BY categoria) 
      FROM productos 
      WHERE categoria IS NOT NULL AND categoria != ''
      ON CONFLICT (nombre) DO NOTHING
    `);
    
    // 3. Agregar columna precio a stock si no existe
    console.log('💰 Agregando columna precio a tabla stock...');
    await client.query(`
      ALTER TABLE stock 
      ADD COLUMN IF NOT EXISTS precio NUMERIC(10,2) NOT NULL DEFAULT 0
    `);
    
    // 4. Migrar precios de variantes a stock
    console.log('💰 Migrando precios de variantes a stock...');
    await client.query(`
      UPDATE stock 
      SET precio = v.precio 
      FROM variantes v 
      WHERE stock.id_variante = v.id_variante 
      AND stock.precio = 0
    `);
    
    // 5. Agregar columna id_categoria a productos
    console.log('📁 Agregando referencia a categorías en productos...');
    await client.query(`
      ALTER TABLE productos 
      ADD COLUMN IF NOT EXISTS id_categoria INTEGER REFERENCES categorias(id_categoria) ON DELETE SET NULL
    `);
    
    // 6. Actualizar productos con id_categoria
    console.log('📁 Actualizando productos con id_categoria...');
    await client.query(`
      UPDATE productos 
      SET id_categoria = c.id_categoria 
      FROM categorias c 
      WHERE productos.categoria = c.nombre 
      AND productos.id_categoria IS NULL
    `);
    
    // 7. Crear función para actualizar fecha_actualizacion en categorías
    console.log('⏰ Creando función para actualizar fecha de categorías...');
    await client.query(`
      CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 8. Crear trigger para categorías
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_actualizar_fecha_categorias ON categorias;
      CREATE TRIGGER trigger_actualizar_fecha_categorias
          BEFORE UPDATE ON categorias
          FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
    `);
    
    // 9. Crear índices
    console.log('🔍 Creando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);
      CREATE INDEX IF NOT EXISTS idx_categorias_orden ON categorias(orden);
      CREATE INDEX IF NOT EXISTS idx_productos_id_categoria ON productos(id_categoria);
      CREATE INDEX IF NOT EXISTS idx_stock_precio ON stock(precio);
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente!');
    
    // Mostrar resumen
    const categoriasCount = await client.query('SELECT COUNT(*) FROM categorias');
    const stockWithPrice = await client.query('SELECT COUNT(*) FROM stock WHERE precio > 0');
    const productosWithCategory = await client.query('SELECT COUNT(*) FROM productos WHERE id_categoria IS NOT NULL');
    
    console.log('\n📊 Resumen de migración:');
    console.log(`- Categorías creadas: ${categoriasCount.rows[0].count}`);
    console.log(`- Registros de stock con precio: ${stockWithPrice.rows[0].count}`);
    console.log(`- Productos con categoría: ${productosWithCategory.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await migratePriceToStock();
    console.log('🎉 Migración completada!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migratePriceToStock };
