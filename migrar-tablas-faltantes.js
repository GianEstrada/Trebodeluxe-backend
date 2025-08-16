// Migración para agregar tablas faltantes al esquema de Neon DB
const { pool } = require('./src/config/db');

async function migrarTablasFaltantes() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migración de tablas faltantes...');
    
    // 1. Crear tabla notas_generales si no existe
    console.log('📝 Creando tabla notas_generales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notas_generales (
        id_nota SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        contenido TEXT NOT NULL,
        prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
        id_usuario_creador INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
        nombre_usuario_creador VARCHAR(200),
        rol_usuario_creador VARCHAR(50),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento TIMESTAMP,
        etiquetas TEXT[],
        color VARCHAR(20) DEFAULT 'default',
        activa BOOLEAN DEFAULT true
      );
    `);

    // 2. Crear índices para notas_generales si no existen
    console.log('📊 Creando índices para notas_generales...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_prioridad ON notas_generales(prioridad);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_fecha_creacion ON notas_generales(fecha_creacion);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_activa ON notas_generales(activa);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_usuario_creador ON notas_generales(id_usuario_creador);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_fecha_vencimiento ON notas_generales(fecha_vencimiento);'
    ];
    
    for (const indice of indices) {
      await client.query(indice);
    }

    // 3. Verificar que las tablas de promociones existan
    console.log('🎯 Verificando tablas de promociones...');
    
    // Verificar si existe promo_x_por_y
    const promoXPorYCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'promo_x_por_y'
      );
    `);
    
    if (!promoXPorYCheck.rows[0].exists) {
      console.log('🔧 Creando tabla promo_x_por_y...');
      await client.query(`
        CREATE TABLE promo_x_por_y (
          id_x_por_y SERIAL PRIMARY KEY,
          id_promocion INTEGER NOT NULL REFERENCES promociones(id_promocion) ON DELETE CASCADE,
          cantidad_comprada INTEGER NOT NULL,
          cantidad_pagada INTEGER NOT NULL,
          UNIQUE(id_promocion)
        );
      `);
    }

    // 4. Verificar columnas en tablas existentes
    console.log('🔍 Verificando columnas en tabla promociones...');
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promociones' 
      AND table_schema = 'public';
    `);
    
    const columns = columnsCheck.rows.map(row => row.column_name);
    console.log('📋 Columnas encontradas en promociones:', columns);

    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar migración
if (require.main === module) {
  migrarTablasFaltantes()
    .then(() => {
      console.log('🎉 Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrarTablasFaltantes };
