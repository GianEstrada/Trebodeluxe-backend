// setup-site-settings.js - Script para configurar automáticamente las configuraciones del sitio

const db = require('./src/config/db');

async function setupSiteSettings() {
  try {
    console.log('🔧 Configurando tabla de configuraciones del sitio...');
    
    // Crear tabla si no existe
    await db.pool.query(`
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
    
    // Crear función y trigger
    await db.pool.query(`
      CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await db.pool.query(`
      DROP TRIGGER IF EXISTS trigger_actualizar_fecha_configuraciones ON configuraciones_sitio;
    `);
    
    await db.pool.query(`
      CREATE TRIGGER trigger_actualizar_fecha_configuraciones
          BEFORE UPDATE ON configuraciones_sitio
          FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
    `);
    
    // Insertar configuraciones por defecto
    await db.pool.query(`
      INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion) VALUES
      ('header_brand_name', 'TREBOLUXE', 'text', 'Nombre de la marca que aparece en el header'),
      ('header_promo_texts', '["ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN", "OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA"]', 'json', 'Textos promocionales rotativos del header')
      ON CONFLICT (clave) DO UPDATE SET
        valor = EXCLUDED.valor,
        descripcion = EXCLUDED.descripcion;
    `);
    
    console.log('✅ Configuraciones del sitio configuradas correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando site settings:', error);
    return false;
  }
}

module.exports = { setupSiteSettings };
