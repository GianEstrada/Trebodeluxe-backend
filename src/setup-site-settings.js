// setup-site-settings.js - Script para configurar automáticamente las configuraciones del sitio

const db = require('./src/config/db');

async function setupSiteSettings() {
  try {
    console.log('🔧 Configurando tablas de configuraciones del sitio...');
    
    // Crear tabla configuraciones_sitio si no existe
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
    
    // Crear tabla imagenes_principales si no existe
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS imagenes_principales (
        id_imagen SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        url VARCHAR(500) NOT NULL,
        public_id VARCHAR(200),
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('hero_banner', 'promocion_banner', 'categoria_destacada')),
        titulo VARCHAR(200),
        subtitulo VARCHAR(300),
        enlace VARCHAR(300),
        orden INTEGER NOT NULL DEFAULT 1,
        activo BOOLEAN DEFAULT true,
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
    
    await db.pool.query(`
      DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes ON imagenes_principales;
    `);
    
    await db.pool.query(`
      CREATE TRIGGER trigger_actualizar_fecha_imagenes
          BEFORE UPDATE ON imagenes_principales
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
    
    // Insertar imágenes por defecto
    await db.pool.query(`
      INSERT INTO imagenes_principales (nombre, url, tipo, titulo, subtitulo, enlace, orden, activo) VALUES
      ('Hero Principal', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'hero_banner', 'NUEVA COLECCIÓN', 'Descubre los últimos trends en moda', '/catalogo', 1, true),
      ('Banner Promoción Verano', 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'promocion_banner', 'OFERTAS DE VERANO', '20% de descuento en segunda prenda', '/catalogo?promocion=verano', 1, true),
      ('Categoría Hombre', 'https://res.cloudinary.com/demo/image/upload/sample3.jpg', 'categoria_destacada', 'MODA MASCULINA', 'Estilo y elegancia para él', '/catalogo?categoria=hombre', 1, true),
      ('Categoría Mujer', 'https://res.cloudinary.com/demo/image/upload/sample4.jpg', 'categoria_destacada', 'MODA FEMENINA', 'Tendencias que definen tu estilo', '/catalogo?categoria=mujer', 2, true)
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Configuraciones del sitio configuradas correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando site settings:', error);
    return false;
  }
}

module.exports = { setupSiteSettings };
