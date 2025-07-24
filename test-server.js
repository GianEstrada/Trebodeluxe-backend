const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Crear una app simple para probar
const app = express();

app.use(cors());
app.use(express.json());

// Importar directamente las rutas de categorías
const publicCategoriasRoutes = require('./src/routes/public-categorias.routes');

// Registrar las rutas
app.use('/api/categorias', publicCategoriasRoutes);

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor de prueba funcionando', timestamp: new Date().toISOString() });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🧪 Servidor de prueba ejecutándose en puerto ${PORT}`);
  console.log(`📍 Prueba: http://localhost:${PORT}/api/test`);
  console.log(`📂 Categorías: http://localhost:${PORT}/api/categorias`);
});
