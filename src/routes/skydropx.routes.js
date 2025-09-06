const express = require('express');
const router = express.Router();
const skyDropXService = require('../utils/skyDropXService');
const SkyDropXAuth = require('../utils/skydropx-auth');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const db = require('../config/db');

// Test de autenticación OAuth2 con SkyDropX (público para testing)
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

// Test de variables de entorno (público para debugging)
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

// Test de conexión con SkyDropX
router.post('/test-connection', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await skyDropXService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error en test de conexión SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener cotización de envío
router.post('/quote', async (req, res) => {
  try {
    const { zip_to, width, height, length, weight } = req.body;

    if (!zip_to || !width || !height || !length || !weight) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para la cotización'
      });
    }

    const result = await skyDropXService.getQuote({
      zip_to,
      width,
      height,
      length,
      weight
    });

    res.json(result);
  } catch (error) {
    console.error('Error obteniendo cotización SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Cotización por categoría
router.post('/quote-category', async (req, res) => {
  try {
    const { category_id, destination_zip } = req.body;

    if (!category_id || !destination_zip) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere category_id y destination_zip'
      });
    }

    const result = await skyDropXService.getQuoteForCategory(category_id, destination_zip);
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo cotización por categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Crear envío
router.post('/shipment', verifyToken, requireAdmin, async (req, res) => {
  try {
    const shipmentData = req.body;

    // Validar datos requeridos
    const requiredFields = ['address_to', 'parcel', 'service_level_code'];
    for (const field of requiredFields) {
      if (!shipmentData[field]) {
        return res.status(400).json({
          success: false,
          message: `Campo requerido faltante: ${field}`
        });
      }
    }

    const result = await skyDropXService.createShipment(shipmentData);
    res.json(result);
  } catch (error) {
    console.error('Error creando envío SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener tracking
router.get('/tracking/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const result = await skyDropXService.getTracking(trackingNumber);
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo tracking SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Calcular dimensiones para categoría
router.get('/dimensions/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await skyDropXService.calculateShippingDimensions(categoryId);
    res.json(result);
  } catch (error) {
    console.error('Error calculando dimensiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Webhook endpoint para recibir actualizaciones de SkyDropX
router.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook recibido de SkyDropX:', req.body);
    
    const result = await skyDropXService.handleWebhook(req.body);
    
    if (result.success) {
      res.status(200).json({ received: true });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error procesando webhook SkyDropX:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Obtener estadísticas de envíos
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Aquí puedes agregar lógica para obtener estadísticas de envíos
    // desde tu base de datos
    const stats = {
      total_shipments: 0,
      pending_shipments: 0,
      completed_shipments: 0,
      failed_shipments: 0
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas SkyDropX:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

module.exports = router;
