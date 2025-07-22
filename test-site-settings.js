// test-site-settings.js - Script para probar las configuraciones del sitio

const express = require('express');
const cors = require('cors');
const db = require('./src/config/db');
const siteSettingsRoutes = require('./src/routes/site-settings.routes');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Probar configuraciones del sitio
app.use('/api/site-settings', siteSettingsRoutes);

// Health check
app.get('/test', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const dbStatus = await db.checkConnection();
    
    if (!dbStatus.connected) {
      return res.status(500).json({ 
        success: false, 
        message: 'No se pudo conectar a la base de datos' 
      });
    }

    // Crear tabla de configuraciones si no existe
    console.log('Creando tabla de configuraciones del sitio...');
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

    // Insertar configuraciones por defecto
    console.log('Insertando configuraciones por defecto...');
    await db.pool.query(`
      INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion) VALUES
      ('header_brand_name', 'TREBOLUXE', 'text', 'Nombre de la marca que aparece en el header'),
      ('header_promo_texts', '["ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN", "OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA"]', 'json', 'Textos promocionales rotativos del header')
      ON CONFLICT (clave) DO NOTHING;
    `);

    res.json({
      success: true,
      message: 'Configuraciones del sitio creadas exitosamente',
      database: dbStatus
    });
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el test',
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de pruebas ejecutándose en http://localhost:${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`- GET  /test - Crear tabla e insertar datos`);
  console.log(`- GET  /api/site-settings/header - Obtener configuraciones del header`);
  console.log(`- PUT  /api/site-settings/header - Actualizar configuraciones del header`);
  console.log(`\n⚡ Para probar:`);
  console.log(`curl http://localhost:${PORT}/test`);
  console.log(`curl http://localhost:${PORT}/api/site-settings/header`);
});

module.exports = app;
