// Migración para corregir estructura de tablas existentes
const { pool } = require('./src/config/db');

async function corregirEstructuraTablas() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando corrección de estructura de tablas...');
    
    // 1. Corregir tabla notas_generales
    console.log('📝 Actualizando tabla notas_generales...');
    
    // Agregar columnas faltantes a notas_generales
    const columnasNotas = [
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS prioridad VARCHAR(20) DEFAULT \'normal\';',
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS id_usuario_creador INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL;',
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS nombre_usuario_creador VARCHAR(200);',
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS rol_usuario_creador VARCHAR(50);',
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMP;',
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS etiquetas TEXT[];',
      'ALTER TABLE notas_generales ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT \'default\';'
    ];
    
    for (const columna of columnasNotas) {
      try {
        await client.query(columna);
        console.log('✅', columna.substring(0, 60) + '...');
      } catch (error) {
        console.log('⚠️', columna.substring(0, 60) + '... (ya existe)');
      }
    }
    
    // Agregar constraint a prioridad si no existe
    try {
      await client.query(`
        ALTER TABLE notas_generales 
        ADD CONSTRAINT check_prioridad 
        CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente'));
      `);
      console.log('✅ Constraint de prioridad agregado');
    } catch (error) {
      console.log('⚠️ Constraint de prioridad ya existe');
    }
    
    // 2. Corregir tabla promo_x_por_y
    console.log('\n🎯 Actualizando tabla promo_x_por_y...');
    
    // Verificar si necesitamos renombrar columnas
    const promoColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promo_x_por_y' 
      AND table_schema = 'public';
    `);
    
    const columnNames = promoColumns.rows.map(row => row.column_name);
    
    if (columnNames.includes('cantidad_comprar') && !columnNames.includes('cantidad_comprada')) {
      await client.query('ALTER TABLE promo_x_por_y RENAME COLUMN cantidad_comprar TO cantidad_comprada;');
      console.log('✅ Renombrado cantidad_comprar → cantidad_comprada');
    }
    
    if (columnNames.includes('cantidad_pagar') && !columnNames.includes('cantidad_pagada')) {
      await client.query('ALTER TABLE promo_x_por_y RENAME COLUMN cantidad_pagar TO cantidad_pagada;');
      console.log('✅ Renombrado cantidad_pagar → cantidad_pagada');
    }
    
    // 3. Crear índices necesarios
    console.log('\n📊 Creando índices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_prioridad ON notas_generales(prioridad);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_fecha_creacion ON notas_generales(fecha_creacion);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_activa ON notas_generales(activa);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_usuario_creador ON notas_generales(id_usuario_creador);',
      'CREATE INDEX IF NOT EXISTS idx_notas_generales_fecha_vencimiento ON notas_generales(fecha_vencimiento);'
    ];
    
    for (const indice of indices) {
      try {
        await client.query(indice);
        console.log('✅', indice.substring(0, 60) + '...');
      } catch (error) {
        console.log('⚠️', indice.substring(0, 60) + '... (error)');
      }
    }
    
    console.log('\n✅ Corrección de estructura completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en corrección:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar corrección
if (require.main === module) {
  corregirEstructuraTablas()
    .then(() => {
      console.log('🎉 Corrección finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { corregirEstructuraTablas };
