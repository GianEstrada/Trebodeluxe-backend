const express = require('express');
const router = express.Router();
const SkyDropXAuth = require('../utils/skydropx-auth');

/**
 * Endpoint temporal para probar la autenticación de SkyDropX
 * Solo para testing - eliminar en producción
 */
router.get('/test-auth', async (req, res) => {
  try {
    console.log('🧪 Testing SkyDropX authentication...');
    
    const skyDropAuth = new SkyDropXAuth();
    const token = await skyDropAuth.getBearerToken();
    
    res.json({
      success: true,
      message: 'Autenticación SkyDropX exitosa',
      tokenInfo: {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...',
        expiresAt: skyDropAuth.tokenCache.expiresAt
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en test de autenticación:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint para verificar variables de entorno
 */
router.get('/test-env', (req, res) => {
  res.json({
    env_check: {
      SKYDROP_API_KEY: process.env.SKYDROP_API_KEY ? '✅ Configurada' : '❌ No configurada',
      SKYDROP_API_SECRET: process.env.SKYDROP_API_SECRET ? '✅ Configurada' : '❌ No configurada',
      NODE_ENV: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
