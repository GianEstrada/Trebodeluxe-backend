// setup-site-settings.js - Script para configurar automáticamente las configuraciones del sitio

const db = require('./config/db');

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
        nombre VARCHAR(100) UNIQUE NOT NULL,
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
      INSERT INTO imagenes_principales (nombre, url, tipo, titulo, subtitulo, enlace, orden) VALUES
      ('Hero Principal', 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'hero_banner', 'Bienvenido a Treboluxe', 'Descubre nuestra nueva colección', '/', 1),
      ('Banner Promoción Verano', 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'promocion_banner', 'Ofertas de Verano', '20% de descuento en segunda prenda', '/catalogo', 2),
      ('Categoría Destacada 1', 'https://res.cloudinary.com/demo/image/upload/sample3.jpg', 'categoria_destacada', 'Playeras', 'Nueva colección de playeras', '/catalogo?categoria=playeras', 3),
      ('Categoría Destacada 2', 'https://res.cloudinary.com/demo/image/upload/sample4.jpg', 'categoria_destacada', 'Hoodies', 'Perfectos para el clima frío', '/catalogo?categoria=hoodies', 4)
      ON CONFLICT (nombre) DO UPDATE SET
        url = EXCLUDED.url,
        titulo = EXCLUDED.titulo,
        subtitulo = EXCLUDED.subtitulo,
        enlace = EXCLUDED.enlace;
    `);
    
    console.log('✅ Configuraciones del sitio configuradas correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando site settings:', error);
    return false;
  }
}

module.exports = { setupSiteSettings };
