const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a.oregon-postgres.render.com/trebolux_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createPrincipalImagesTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración de tabla imagenes_principales_nuevas...');
    
    // Crear la nueva tabla
    await client.query(`
      -- Crear nueva tabla para imágenes principales con posicionamiento
      DROP TABLE IF EXISTS imagenes_principales_nuevas CASCADE;

      CREATE TABLE imagenes_principales_nuevas (
          id_imagen SERIAL PRIMARY KEY,
          nombre VARCHAR(200) NOT NULL,
          descripcion TEXT,
          url VARCHAR(500) NOT NULL,
          public_id VARCHAR(200) NOT NULL,
          posicion VARCHAR(20) NOT NULL DEFAULT 'inactiva' CHECK (posicion IN ('inactiva', 'izquierda', 'derecha')),
          orden INTEGER DEFAULT 0,
          activo BOOLEAN DEFAULT true,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabla imagenes_principales_nuevas creada');

    // Función para actualizar fecha de modificación
    await client.query(`
      CREATE OR REPLACE FUNCTION actualizar_fecha_imagenes_principales()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Función actualizar_fecha_imagenes_principales creada');

    // Trigger para actualizar fecha
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes_principales ON imagenes_principales_nuevas;
      CREATE TRIGGER trigger_actualizar_fecha_imagenes_principales
          BEFORE UPDATE ON imagenes_principales_nuevas
          FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_imagenes_principales();
    `);
    
    console.log('✅ Trigger de fecha creado');

    // Función para manejar el posicionamiento único
    await client.query(`
      CREATE OR REPLACE FUNCTION validar_posicion_unica()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Si la nueva posición es 'izquierda' o 'derecha'
          IF NEW.posicion IN ('izquierda', 'derecha') THEN
              -- Cambiar cualquier imagen existente en esa posición a 'inactiva'
              UPDATE imagenes_principales_nuevas 
              SET posicion = 'inactiva' 
              WHERE posicion = NEW.posicion AND id_imagen != NEW.id_imagen;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Función validar_posicion_unica creada');

    // Trigger para validar posicionamiento único
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_validar_posicion_unica ON imagenes_principales_nuevas;
      CREATE TRIGGER trigger_validar_posicion_unica
          BEFORE INSERT OR UPDATE ON imagenes_principales_nuevas
          FOR EACH ROW EXECUTE FUNCTION validar_posicion_unica();
    `);
    
    console.log('✅ Trigger de posicionamiento único creado');

    // Índices para optimización
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_imagenes_principales_nuevas_posicion ON imagenes_principales_nuevas(posicion);
      CREATE INDEX IF NOT EXISTS idx_imagenes_principales_nuevas_activo ON imagenes_principales_nuevas(activo);
      CREATE INDEX IF NOT EXISTS idx_imagenes_principales_nuevas_orden ON imagenes_principales_nuevas(orden);
      CREATE INDEX IF NOT EXISTS idx_imagenes_principales_nuevas_nombre ON imagenes_principales_nuevas(nombre);
    `);
    
    console.log('✅ Índices creados');
    
    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar la migración
createPrincipalImagesTable()
  .then(() => {
    console.log('✅ Proceso de migración terminado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el proceso de migración:', error);
    process.exit(1);
  });
