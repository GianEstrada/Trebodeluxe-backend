const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateToImagenesIndex() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración a imagenes_index...');
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    // 1. Crear la nueva tabla imagenes_index
    console.log('📋 Creando tabla imagenes_index...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS imagenes_index (
        id_imagen SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        url VARCHAR(500) NOT NULL,
        public_id VARCHAR(200),
        seccion VARCHAR(50) NOT NULL CHECK (seccion IN ('principal', 'banner')),
        descripcion TEXT,
        estado VARCHAR(20) NOT NULL DEFAULT 'inactivo' CHECK (estado IN ('activo', 'inactivo', 'izquierda', 'derecha')),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Crear trigger para actualización automática
    console.log('⚙️ Creando trigger para fecha de actualización...');
    await client.query(`
      CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes_index ON imagenes_index;
      CREATE TRIGGER trigger_actualizar_fecha_imagenes_index
          BEFORE UPDATE ON imagenes_index
          FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
    `);
    
    // 3. Crear índices para optimización
    console.log('🔍 Creando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_imagenes_index_seccion ON imagenes_index(seccion);
      CREATE INDEX IF NOT EXISTS idx_imagenes_index_estado ON imagenes_index(estado);
    `);
    
    // 4. Migrar datos de imagenes_principales si existe
    const checkOldTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'imagenes_principales'
      );
    `);
    
    if (checkOldTable.rows[0].exists) {
      console.log('🔄 Migrando datos de imagenes_principales...');
      
      // Migrar imágenes hero como principales
      await client.query(`
        INSERT INTO imagenes_index (nombre, url, public_id, seccion, descripcion, estado)
        SELECT 
          nombre,
          url,
          public_id,
          'principal' as seccion,
          COALESCE(titulo, '') as descripcion,
          CASE 
            WHEN activo = true THEN 'izquierda'
            ELSE 'inactivo'
          END as estado
        FROM imagenes_principales 
        WHERE tipo = 'hero_banner'
      `);
      
      // Migrar imágenes de promoción como banner
      await client.query(`
        INSERT INTO imagenes_index (nombre, url, public_id, seccion, descripcion, estado)
        SELECT 
          nombre,
          url,
          public_id,
          'banner' as seccion,
          COALESCE(titulo, '') as descripcion,
          CASE 
            WHEN activo = true THEN 'activo'
            ELSE 'inactivo'
          END as estado
        FROM imagenes_principales 
        WHERE tipo = 'promocion_banner'
      `);
      
      console.log('✅ Datos migrados exitosamente');
    }
    
    // 5. Insertar datos de ejemplo si la tabla está vacía
    const countImages = await client.query('SELECT COUNT(*) FROM imagenes_index');
    if (parseInt(countImages.rows[0].count) === 0) {
      console.log('📝 Insertando datos de ejemplo...');
      await client.query(`
        INSERT INTO imagenes_index (nombre, url, seccion, descripcion, estado) VALUES
        ('Imagen Principal Izquierda', '/797e7904b64e13508ab322be3107e368-1@2x.png', 'principal', 'Imagen principal del lado izquierdo', 'izquierda'),
        ('Imagen Principal Derecha', '/look-polo-2-1@2x.png', 'principal', 'Imagen principal del lado derecho', 'derecha'),
        ('Banner Promoción', '/promociones-playa.jpg', 'banner', 'Banner de promociones especiales', 'activo')
      `);
    }
    
    // Confirmar transacción
    await client.query('COMMIT');
    console.log('✅ Migración completada exitosamente');
    
    // Mostrar estado actual
    const result = await client.query('SELECT * FROM imagenes_index ORDER BY seccion, estado');
    console.log('\n📊 Estado actual de imagenes_index:');
    console.table(result.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateToImagenesIndex()
    .then(() => {
      console.log('🎉 Proceso de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}

module.exports = { migrateToImagenesIndex };
