const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar configuración de base de datos
const { pool } = require('./src/config/db');

// Importar rutas
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test básico de conexión a BD
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM imagenes_index');
    res.json({
      success: true,
      message: 'Conexión exitosa a la BD',
      imagenes_count: result.rows[0].count
    });
  } catch (error) {
    console.error('Error conectando a la BD:', error);
    res.status(500).json({
      success: false,
      message: 'Error conectando a la BD',
      error: error.message
    });
  }
});

// Usar rutas de admin
app.use('/api/admin', adminRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Servidor de imágenes index funcionando correctamente'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log(`🖼️ Imágenes Index: http://localhost:${PORT}/api/admin/index-images`);
});

module.exports = app;
