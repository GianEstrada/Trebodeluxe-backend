const express = require('express');
const app = express();

// Test básico sin imports complicados
console.log('=== DEBUG RUTAS SIZES ===');

// Crear router simple
const router = express.Router();

router.get('/debug', (req, res) => {
  res.json({ 
    message: 'Debug route working', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

router.get('/test', (req, res) => {
  res.json({ 
    message: 'Test route working', 
    timestamp: new Date().toISOString() 
  });
});

console.log('Router creado, registrando en /api/sizes...');
app.use('/api/sizes', router);
console.log('Router registrado exitosamente');

// Middleware para manejar 404
app.use((req, res) => {
  console.log(`404 - ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/sizes/test`);
  console.log(`Try: http://localhost:${PORT}/api/sizes/debug`);
});
