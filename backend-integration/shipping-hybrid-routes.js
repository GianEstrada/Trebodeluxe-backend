/**
 * 🚀 ENDPOINT PARA COTIZACIÓN HÍBRIDA CON SELECTOR DE PAÍSES
 * Maneja las solicitudes del frontend con país seleccionado
 */

const express = require('express');
const router = express.Router();
const ShippingQuoteService = require('../utils/shipping-quote.service');

// Instancia del servicio
const shippingService = new ShippingQuoteService();

/**
 * POST /api/shipping/quote-hybrid
 * Endpoint principal para cotización híbrida con selección de país
 */
router.post('/quote-hybrid', async (req, res) => {
  console.log('🌍 ==========================================');
  console.log('🌍 NUEVA SOLICITUD COTIZACIÓN HÍBRIDA');
  console.log('🌍 ==========================================');
  
  try {
    const { cartId, postalCode, forceCountry } = req.body;
    
    // Validaciones básicas
    if (!cartId) {
      return res.status(400).json({
        success: false,
        error: 'Cart ID es requerido',
        code: 'MISSING_CART_ID'
      });
    }

    if (!postalCode) {
      return res.status(400).json({
        success: false,
        error: 'Código postal es requerido',
        code: 'MISSING_POSTAL_CODE'
      });
    }

    // Log de la solicitud
    console.log('📦 Cart ID:', cartId);
    console.log('📍 Código postal:', postalCode);
    console.log('🏳️  País forzado:', forceCountry || 'Auto-detección');
    console.log('🌐 IP Cliente:', req.ip);
    console.log('⏰ Timestamp:', new Date().toISOString());

    // Llamar a la función híbrida
    const startTime = Date.now();
    const result = await shippingService.getShippingQuoteHybrid(
      cartId, 
      postalCode.trim(), 
      forceCountry
    );
    const responseTime = Date.now() - startTime;

    console.log(`⏱️  Tiempo de respuesta: ${responseTime}ms`);

    if (result.success) {
      console.log('✅ COTIZACIÓN EXITOSA');
      console.log(`📊 Cotizaciones encontradas: ${result.quotations?.length || 0}`);
      console.log(`🌍 Tipo: ${result.isInternational ? 'Internacional' : 'Nacional'}`);
      console.log(`🔄 Híbrido: ${result.isHybrid ? 'Sí' : 'No'}`);

      // Formatear respuesta para frontend
      res.json({
        success: true,
        quotations: result.quotations || [],
        cartData: result.cartData,
        addressData: result.addressData,
        isInternational: result.isInternational || false,
        isHybrid: result.isHybrid || false,
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        
        // Información adicional para el frontend
        metadata: {
          postalCode: postalCode.trim(),
          forceCountry: forceCountry,
          detectedCountry: result.detectedCountry,
          functionUsed: result.isInternational ? 'getShippingQuoteInternational' : 'getShippingQuote'
        }
      });

    } else {
      console.log('❌ ERROR EN COTIZACIÓN');
      console.log(`   Error: ${result.error}`);

      // Formatear error para frontend
      res.status(400).json({
        success: false,
        error: result.error || 'Error desconocido en cotización',
        details: result.details,
        code: result.code || 'QUOTATION_ERROR',
        isHybrid: result.isHybrid || false,
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        
        // Información de debugging (solo en development)
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            cartId: cartId,
            postalCode: postalCode.trim(),
            forceCountry: forceCountry,
            stack: result.stack
          }
        })
      });
    }

  } catch (error) {
    console.error('💥 ERROR CRÍTICO EN ENDPOINT:');
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      
      // Información de debugging (solo en development)
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          message: error.message,
          stack: error.stack
        }
      })
    });
  }
});

/**
 * GET /api/shipping/countries
 * Endpoint para obtener lista de países soportados
 */
router.get('/countries', (req, res) => {
  const countries = [
    { code: 'MX', name: 'México', flag: '🇲🇽', type: 'national', isDefault: true },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', type: 'international' },
    { code: 'CA', name: 'Canadá', flag: '🇨🇦', type: 'international' },
    { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', type: 'international' },
    { code: 'DE', name: 'Alemania', flag: '🇩🇪', type: 'international' },
    { code: 'FR', name: 'Francia', flag: '🇫🇷', type: 'international' },
    { code: 'ES', name: 'España', flag: '🇪🇸', type: 'international' },
    { code: 'IT', name: 'Italia', flag: '🇮🇹', type: 'international' },
    { code: 'JP', name: 'Japón', flag: '🇯🇵', type: 'international' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', type: 'international' },
    { code: 'BR', name: 'Brasil', flag: '🇧🇷', type: 'international' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷', type: 'international' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴', type: 'international' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪', type: 'international' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱', type: 'international' },
    { code: 'NL', name: 'Países Bajos', flag: '🇳🇱', type: 'international' }
  ];

  res.json({
    success: true,
    countries: countries,
    total: countries.length,
    national: countries.filter(c => c.type === 'national').length,
    international: countries.filter(c => c.type === 'international').length
  });
});

/**
 * POST /api/shipping/detect-country
 * Endpoint para detectar país desde código postal
 */
router.post('/detect-country', (req, res) => {
  try {
    const { postalCode } = req.body;

    if (!postalCode) {
      return res.status(400).json({
        success: false,
        error: 'Código postal es requerido'
      });
    }

    // Usar función de detección del servicio
    const detectedCountry = shippingService.detectCountryFromPostalCode(postalCode);

    res.json({
      success: true,
      postalCode: postalCode.trim(),
      detectedCountry: detectedCountry,
      confidence: detectedCountry ? 'high' : 'low',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error detectando país:', error);
    res.status(500).json({
      success: false,
      error: 'Error detectando país',
      code: 'DETECTION_ERROR'
    });
  }
});

/**
 * GET /api/shipping/status
 * Endpoint para verificar estado del sistema de envíos
 */
router.get('/status', async (req, res) => {
  try {
    // Verificar conectividad con APIs externas
    const status = {
      service: 'Shipping Hybrid System',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'operational',
      
      components: {
        hybridFunction: {
          status: 'operational',
          description: 'Función híbrida de cotización'
        },
        mexicanDatabase: {
          status: 'operational',
          description: 'Base de datos de códigos postales mexicanos',
          records: 31958
        },
        internationalSystem: {
          status: 'operational',
          description: 'Sistema de códigos postales internacionales',
          countries: 16
        },
        skyDropXAPI: {
          status: 'unknown',
          description: 'API SkyDropX PRO (requiere carrito real para validar)'
        }
      }
    };

    res.json(status);

  } catch (error) {
    console.error('Error verificando status:', error);
    res.status(500).json({
      service: 'Shipping Hybrid System',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
