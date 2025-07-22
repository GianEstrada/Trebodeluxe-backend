// apply-site-settings-migration.js - Aplicar migración para configuraciones del sitio

const { Pool } = require('pg');

// Usar la misma conexión que usa la app
const DATABASE_URL = 'postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a/trebolux_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function applySiteSettingsMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // 1. Crear tabla si no existe
    console.log('📝 Creando tabla configuraciones_sitio...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuraciones_sitio (
        id_configuracion SERIAL PRIMARY KEY,
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT,
        tipo VARCHAR(50) DEFAULT 'text',
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Crear función y trigger si no existen
    console.log('⚙️ Creando función y trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_actualizar_fecha_configuraciones ON configuraciones_sitio;
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_actualizar_fecha_configuraciones
          BEFORE UPDATE ON configuraciones_sitio
          FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
    `);
    
    // 3. Insertar configuraciones por defecto
    console.log('📋 Insertando configuraciones por defecto...');
    await client.query(`
      INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion) VALUES
      ('header_brand_name', 'TREBOLUXE', 'text', 'Nombre de la marca que aparece en el header'),
      ('header_promo_texts', '["ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN", "OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA"]', 'json', 'Textos promocionales rotativos del header')
      ON CONFLICT (clave) DO UPDATE SET
        valor = EXCLUDED.valor,
        descripcion = EXCLUDED.descripcion;
    `);
    
    // 4. Verificar que todo se creó correctamente
    console.log('🔍 Verificando datos insertados...');
    const result = await client.query('SELECT * FROM configuraciones_sitio ORDER BY clave');
    
    console.log('✅ Configuraciones en la base de datos:');
    result.rows.forEach(row => {
      console.log(`   - ${row.clave}: ${row.valor}`);
    });
    
    // 5. Probar las funciones del controlador básicamente
    console.log('🧪 Probando consulta de header settings...');
    const headerQuery = `
      SELECT clave, valor, tipo
      FROM configuraciones_sitio
      WHERE clave IN ('header_brand_name', 'header_promo_texts')
      ORDER BY clave
    `;
    
    const headerResult = await client.query(headerQuery);
    const headerSettings = {
      brandName: 'TREBOLUXE',
      promoTexts: [
        'ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN',
        'OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA'
      ]
    };
    
    headerResult.rows.forEach(row => {
      if (row.clave === 'header_brand_name') {
        headerSettings.brandName = row.valor || 'TREBOLUXE';
      } else if (row.clave === 'header_promo_texts') {
        try {
          headerSettings.promoTexts = row.valor ? JSON.parse(row.valor) : headerSettings.promoTexts;
        } catch (e) {
          console.warn('Error parsing promo texts JSON:', e);
        }
      }
    });
    
    console.log('✅ Header settings procesados correctamente:', JSON.stringify(headerSettings, null, 2));
    
    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('🔥 El servidor necesita ser reiniciado en Render para que tome las nuevas rutas.');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración
applySiteSettingsMigration()
  .then(() => {
    console.log('🏁 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  });
