// migrate-to-neon-fixed.js
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrateToNeonFixed() {
  console.log('🚀 Iniciando migración a Neon DB (versión mejorada)...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a Neon DB');
    
    // Leer el esquema completo
    console.log('📖 Leyendo esquema completo...');
    const schemaPath = path.join(__dirname, 'src/config/complete_schema_with_promotions.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Remover referencias a notas_generales que no existen en nuestro esquema
    schema = schema.replace(/CREATE INDEX idx_notas_generales.*/g, '-- Removed notas_generales index');
    
    console.log('🔄 Ejecutando esquema completo...');
    
    try {
      // Ejecutar todo el esquema de una vez
      await client.query(schema);
      console.log('✅ Esquema ejecutado exitosamente');
    } catch (error) {
      console.log('⚠️  Error ejecutando esquema completo, intentando por partes...');
      
      // Si falla, ejecutar parte por parte
      const sections = [
        // Primero las extensiones
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
        
        // Luego los drops
        `DROP TABLE IF EXISTS seguimiento_envio CASCADE;
         DROP TABLE IF EXISTS pedido_detalle CASCADE;
         DROP TABLE IF EXISTS pedidos CASCADE;
         DROP TABLE IF EXISTS metodos_pago CASCADE;
         DROP TABLE IF EXISTS metodos_envio CASCADE;
         DROP TABLE IF EXISTS promocion_aplicacion CASCADE;
         DROP TABLE IF EXISTS promo_codigo CASCADE;
         DROP TABLE IF EXISTS promo_porcentaje CASCADE;
         DROP TABLE IF EXISTS promo_x_por_y CASCADE;
         DROP TABLE IF EXISTS promociones CASCADE;
         DROP TABLE IF EXISTS stock CASCADE;
         DROP TABLE IF EXISTS imagenes_variante CASCADE;
         DROP TABLE IF EXISTS variantes CASCADE;
         DROP TABLE IF EXISTS productos CASCADE;
         DROP TABLE IF EXISTS tallas CASCADE;
         DROP TABLE IF EXISTS sistemas_talla CASCADE;
         DROP TABLE IF EXISTS imagenes_index CASCADE;
         DROP TABLE IF EXISTS configuraciones_sitio CASCADE;
         DROP TABLE IF EXISTS informacion_envio CASCADE;
         DROP TABLE IF EXISTS usuarios CASCADE;`,
        
        // Tabla usuarios
        `CREATE TABLE usuarios (
          id_usuario SERIAL PRIMARY KEY,
          nombres VARCHAR(100) NOT NULL,
          apellidos VARCHAR(100) NOT NULL,
          correo VARCHAR(100) UNIQUE NOT NULL,
          contrasena VARCHAR(255) NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          usuario VARCHAR(50) UNIQUE NOT NULL,
          rol VARCHAR(20) DEFAULT 'user' CHECK (rol IN ('user', 'admin', 'moderator'))
        );`,
        
        // Tabla informacion_envio
        `CREATE TABLE informacion_envio (
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
        );`,
        
        // Tabla imagenes_index
        `CREATE TABLE imagenes_index (
          id_imagen SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          url VARCHAR(500) NOT NULL,
          public_id VARCHAR(200),
          seccion VARCHAR(50) NOT NULL CHECK (seccion IN ('principal', 'banner')),
          descripcion TEXT,
          estado VARCHAR(20) NOT NULL DEFAULT 'inactivo' CHECK (estado IN ('activo', 'inactivo', 'izquierda', 'derecha')),
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Tabla configuraciones_sitio
        `CREATE TABLE configuraciones_sitio (
          id_configuracion SERIAL PRIMARY KEY,
          clave VARCHAR(100) UNIQUE NOT NULL,
          valor TEXT,
          tipo VARCHAR(50) DEFAULT 'text',
          descripcion TEXT,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Función para triggers
        `CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;`,
        
        // Triggers
        `DROP TRIGGER IF EXISTS trigger_actualizar_fecha_configuraciones ON configuraciones_sitio;
         CREATE TRIGGER trigger_actualizar_fecha_configuraciones
             BEFORE UPDATE ON configuraciones_sitio
             FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();`,
        
        `DROP TRIGGER IF EXISTS trigger_actualizar_fecha_imagenes ON imagenes_index;
         CREATE TRIGGER trigger_actualizar_fecha_imagenes
             BEFORE UPDATE ON imagenes_index
             FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();`,
        
        // Tabla categorias
        `CREATE TABLE categorias (
          id_categoria SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL UNIQUE,
          descripcion TEXT,
          activo BOOLEAN DEFAULT true,
          orden INTEGER DEFAULT 0,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Sistema de tallas
        `CREATE TABLE sistemas_talla (
          id_sistema_talla SERIAL PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL
        );`,
        
        `CREATE TABLE tallas (
          id_talla SERIAL PRIMARY KEY,
          id_sistema_talla INTEGER NOT NULL REFERENCES sistemas_talla(id_sistema_talla) ON DELETE CASCADE,
          nombre_talla VARCHAR(20) NOT NULL,
          orden INTEGER NOT NULL
        );`,
        
        // Productos
        `CREATE TABLE productos (
          id_producto SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          descripcion TEXT NOT NULL,
          id_categoria INTEGER REFERENCES categorias(id_categoria) ON DELETE SET NULL,
          marca VARCHAR(50),
          id_sistema_talla INTEGER REFERENCES sistemas_talla(id_sistema_talla) ON DELETE SET NULL,
          activo BOOLEAN DEFAULT true,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Variantes
        `CREATE TABLE variantes (
          id_variante SERIAL PRIMARY KEY,
          id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
          nombre VARCHAR(100) NOT NULL,
          activo BOOLEAN DEFAULT true,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,
        
        // Imagenes variante
        `CREATE TABLE imagenes_variante (
          id_imagen SERIAL PRIMARY KEY,
          id_variante INTEGER NOT NULL REFERENCES variantes(id_variante) ON DELETE CASCADE,
          url VARCHAR(255) NOT NULL,
          public_id VARCHAR(150) NOT NULL,
          orden INTEGER NOT NULL
        );`,
        
        // Stock
        `CREATE TABLE stock (
          id_stock SERIAL PRIMARY KEY,
          id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
          id_variante INTEGER NOT NULL REFERENCES variantes(id_variante) ON DELETE CASCADE,
          id_talla INTEGER NOT NULL REFERENCES tallas(id_talla) ON DELETE CASCADE,
          cantidad INTEGER NOT NULL DEFAULT 0,
          precio NUMERIC(10,2) NOT NULL DEFAULT 0,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(id_producto, id_variante, id_talla)
        );`,
        
        // Promociones
        `CREATE TABLE promociones (
          id_promocion SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('x_por_y', 'porcentaje', 'codigo')),
          fecha_inicio TIMESTAMP NOT NULL,
          fecha_fin TIMESTAMP NOT NULL,
          uso_maximo INTEGER,
          veces_usado INTEGER DEFAULT 0,
          activo BOOLEAN NOT NULL DEFAULT true
        );`,
        
        // Métodos de envío y pago
        `CREATE TABLE metodos_envio (
          id_metodo_envio SERIAL PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL,
          descripcion TEXT
        );`,
        
        `CREATE TABLE metodos_pago (
          id_metodo_pago SERIAL PRIMARY KEY,
          nombre VARCHAR(50) NOT NULL,
          descripcion TEXT
        );`,
        
        // Pedidos
        `CREATE TABLE pedidos (
          id_pedido SERIAL PRIMARY KEY,
          id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
          id_informacion_envio INTEGER REFERENCES informacion_envio(id_informacion) ON DELETE SET NULL,
          id_metodo_envio INTEGER REFERENCES metodos_envio(id_metodo_envio) ON DELETE RESTRICT,
          id_metodo_pago INTEGER REFERENCES metodos_pago(id_metodo_pago) ON DELETE RESTRICT,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado VARCHAR(20) DEFAULT 'no_revisado',
          total NUMERIC(10,2),
          notas TEXT,
          token_sesion VARCHAR(100)
        );`,
        
        // Pedido detalle
        `CREATE TABLE pedido_detalle (
          id_detalle SERIAL PRIMARY KEY,
          id_pedido INTEGER NOT NULL REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
          id_producto INTEGER REFERENCES productos(id_producto) ON DELETE RESTRICT,
          id_variante INTEGER REFERENCES variantes(id_variante) ON DELETE RESTRICT,
          id_talla INTEGER REFERENCES tallas(id_talla) ON DELETE RESTRICT,
          cantidad INTEGER NOT NULL,
          precio_unitario NUMERIC(10,2) NOT NULL
        );`
      ];
      
      for (let i = 0; i < sections.length; i++) {
        try {
          console.log(`  Ejecutando sección ${i + 1}/${sections.length}...`);
          await client.query(sections[i]);
        } catch (err) {
          console.log(`    ⚠️  Error en sección ${i + 1}: ${err.message}`);
        }
      }
    }
    
    // Verificar las tablas creadas
    console.log('🔍 Verificando tablas creadas...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Tablas creadas: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`  ✅ ${row.table_name}`));
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await pool.end();
  }
}

migrateToNeonFixed();
