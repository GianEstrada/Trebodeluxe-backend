const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Backend server is running'
  });
});

// Ruta para servir la pantalla de carga
app.get('/loading', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loading.html'));
});

// Ruta raíz que redirige a la pantalla de carga
app.get('/', (req, res) => {
  res.redirect('/loading');
});

// Endpoint para verificar el estado del frontend
app.get('/api/frontend-status', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://trebodeluxe-front.onrender.com';
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${frontendUrl}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      res.json({ 
        status: 'ready', 
        message: 'Frontend is ready',
        frontendUrl: frontendUrl
      });
    } else {
      res.status(503).json({ 
        status: 'not_ready', 
        message: 'Frontend is not ready yet' 
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not_ready', 
      message: 'Frontend is not ready yet',
      error: error.message 
    });
  }
});

// Endpoint básico de productos para testing
app.get('/api/products', (req, res) => {
  res.json([
    {
      id: 1,
      name: "Camiseta Básica Premium",
      price: 24.99,
      image: "/797e7904b64e13508ab322be3107e368-1@2x.png",
      category: "Camisetas"
    }
  ]);
});

// Catch-all para redirigir rutas no encontradas a la pantalla de carga
app.get('*', (req, res) => {
  res.redirect('/loading');
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📱 Loading screen available at http://localhost:${PORT}/loading`);
  console.log(`💚 Health check at http://localhost:${PORT}/health`);
});

module.exports = app;
