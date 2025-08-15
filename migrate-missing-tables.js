// migrate-missing-tables.js
require('dotenv').config();
const { Pool } = require('pg');

async function migrateMissingTables() {
  console.log('📦 Migrando tablas faltantes a Neon DB...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    
    // 1. Tabla imagenes_principales
    console.log('🖼️ Creando tabla imagenes_principales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS imagenes_principales (
        id_imagen SERIAL PRIMARY KEY,
        id_producto INTEGER REFERENCES productos(id_producto) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        cloudinary_id VARCHAR(255),
        es_principal BOOLEAN DEFAULT false,
        orden INTEGER DEFAULT 0,
        fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Tabla notas_generales
    console.log('📝 Creando tabla notas_generales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notas_generales (
        id_nota SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        contenido TEXT,
        tipo VARCHAR(50) DEFAULT 'general',
        activa BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 3. Tabla promo_codigo
    console.log('🏷️ Creando tabla promo_codigo...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_codigo (
        id_promo_codigo SERIAL PRIMARY KEY,
        id_promocion INTEGER REFERENCES promociones(id_promocion) ON DELETE CASCADE,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        usos_maximos INTEGER DEFAULT 1,
        usos_actuales INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Tabla promo_porcentaje
    console.log('💯 Creando tabla promo_porcentaje...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_porcentaje (
        id_promo_porcentaje SERIAL PRIMARY KEY,
        id_promocion INTEGER REFERENCES promociones(id_promocion) ON DELETE CASCADE,
        porcentaje_descuento DECIMAL(5,2) NOT NULL CHECK (porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
        monto_minimo DECIMAL(10,2) DEFAULT 0,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 5. Tabla promo_x_por_y
    console.log('🔢 Creando tabla promo_x_por_y...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS promo_x_por_y (
        id_promo_x_por_y SERIAL PRIMARY KEY,
        id_promocion INTEGER REFERENCES promociones(id_promocion) ON DELETE CASCADE,
        cantidad_comprar INTEGER NOT NULL CHECK (cantidad_comprar > 0),
        cantidad_pagar INTEGER NOT NULL CHECK (cantidad_pagar > 0),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 6. Tabla promocion_aplicacion
    console.log('🎯 Creando tabla promocion_aplicacion...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS promocion_aplicacion (
        id_aplicacion SERIAL PRIMARY KEY,
        id_promocion INTEGER REFERENCES promociones(id_promocion) ON DELETE CASCADE,
        id_producto INTEGER REFERENCES productos(id_producto) ON DELETE CASCADE,
        id_categoria INTEGER REFERENCES categorias(id_categoria) ON DELETE CASCADE,
        aplica_a VARCHAR(20) CHECK (aplica_a IN ('producto', 'categoria', 'todos')) DEFAULT 'todos',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 7. Tabla seguimiento_envio
    console.log('📦 Creando tabla seguimiento_envio...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS seguimiento_envio (
        id_seguimiento SERIAL PRIMARY KEY,
        id_pedido INTEGER REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
        estado VARCHAR(50) NOT NULL,
        descripcion TEXT,
        fecha_estado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ubicacion VARCHAR(255),
        transportadora VARCHAR(100),
        numero_guia VARCHAR(100)
      )
    `);
    
    // Verificar tablas creadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Total de tablas en Neon DB: ${result.rows.length}`);
    console.log('📋 Tablas existentes:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('🎉 Migración de tablas faltantes completada!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

migrateMissingTables();
