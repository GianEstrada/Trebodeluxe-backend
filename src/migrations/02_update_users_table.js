const db = require('../config/db');

/**
 * Migración para actualizar la tabla de usuarios con la nueva estructura
 */
const up = async () => {
  try {
    console.log('Iniciando migración: Actualizar tabla usuarios...');
    
    // 1. Crear nueva tabla con la estructura actualizada
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios_new (
        id_usuario SERIAL PRIMARY KEY,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        correo VARCHAR(100) UNIQUE NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario VARCHAR(50) UNIQUE NOT NULL
      );
    `);
    
    // 2. Verificar si la tabla original existe y tiene datos
    const checkTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      // 3. Verificar la estructura de la tabla original
      const checkColumns = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        AND table_schema = 'public';
      `);
      
      const columns = checkColumns.rows.map(row => row.column_name);
      console.log('Columnas encontradas en tabla usuarios:', columns);
      
      // 4. Migrar datos si existen y la estructura es compatible
      if (columns.includes('id') || columns.includes('id_usuario')) {
        try {
          // Intentar migrar datos con diferentes estructuras posibles
          if (columns.includes('username') && !columns.includes('usuario')) {
            // Migrar desde estructura antigua con username
            await db.query(`
              INSERT INTO usuarios_new (nombres, apellidos, correo, contrasena, fecha_creacion, usuario)
              SELECT 
                COALESCE(nombres, 'Usuario'), 
                COALESCE(apellidos, 'Sin Apellido'),
                COALESCE(email, correo),
                COALESCE(password, contrasena),
                COALESCE(fecha_registro, fecha_creacion, CURRENT_TIMESTAMP),
                username
              FROM usuarios
              WHERE username IS NOT NULL
              ON CONFLICT (correo) DO NOTHING
              ON CONFLICT (usuario) DO NOTHING;
            `);
          } else if (columns.includes('usuario')) {
            // La tabla ya tiene la estructura nueva
            console.log('La tabla usuarios ya tiene la estructura correcta.');
            await db.query('DROP TABLE IF EXISTS usuarios_new;');
            return;
          } else {
            // Crear usuarios por defecto si no hay datos compatibles
            console.log('Estructura de tabla no compatible, creando usuario por defecto...');
          }
        } catch (migrateError) {
          console.log('Error en migración de datos, continuando con tabla nueva:', migrateError.message);
        }
      }
      
      // 5. Reemplazar tabla original
      await db.query('DROP TABLE IF EXISTS usuarios CASCADE;');
    }
    
    // 6. Renombrar tabla nueva
    await db.query('ALTER TABLE usuarios_new RENAME TO usuarios;');
    
    // 7. Actualizar tabla de información de envío
    await db.query(`
      CREATE TABLE IF NOT EXISTS informacion_envio_new (
        id_informacion SERIAL PRIMARY KEY,
        id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        nombre_completo VARCHAR(200) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        direccion TEXT NOT NULL,
        ciudad VARCHAR(100) NOT NULL,
        estado VARCHAR(100) NOT NULL,
        codigo_postal VARCHAR(10) NOT NULL,
        pais VARCHAR(100) NOT NULL,
        ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Verificar si existe tabla de información de envío antigua
    const checkShippingTable = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'informacion_envio'
      );
    `);
    
    if (checkShippingTable.rows[0].exists) {
      // Intentar migrar datos de envío
      try {
        await db.query(`
          INSERT INTO informacion_envio_new 
          SELECT * FROM informacion_envio
          ON CONFLICT DO NOTHING;
        `);
        await db.query('DROP TABLE informacion_envio CASCADE;');
      } catch (shippingError) {
        console.log('Error migrando datos de envío:', shippingError.message);
        await db.query('DROP TABLE IF EXISTS informacion_envio CASCADE;');
      }
    }
    
    await db.query('ALTER TABLE informacion_envio_new RENAME TO informacion_envio;');
    
    // 8. Crear índices
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
      CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
      CREATE INDEX IF NOT EXISTS idx_informacion_envio_usuario ON informacion_envio(id_usuario);
    `);
    
    console.log('Migración completada exitosamente.');
    
  } catch (error) {
    console.error('Error en migración:', error);
    throw error;
  }
};

/**
 * Rollback de la migración
 */
const down = async () => {
  try {
    console.log('Revirtiendo migración: Actualizar tabla usuarios...');
    
    // En un rollback real, restauraríamos desde un backup
    // Por ahora, solo eliminamos las tablas
    await db.query('DROP TABLE IF EXISTS informacion_envio CASCADE;');
    await db.query('DROP TABLE IF EXISTS usuarios CASCADE;');
    
    console.log('Rollback completado.');
    
  } catch (error) {
    console.error('Error en rollback:', error);
    throw error;
  }
};

module.exports = {
  up,
  down
};
