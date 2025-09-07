/**
 * Endpoint de ejemplo para demostrar el sistema internacional de códigos postales
 * Este archivo muestra cómo integrar el sistema en rutas de Express.js
 */

const express = require('express');
const ShippingQuoteService = require('../utils/shipping-quote.service');

const router = express.Router();
const shippingService = new ShippingQuoteService();

/**
 * GET /api/shipping/countries/detect/:postalCode
 * Detecta el país basado en un código postal
 */
router.get('/countries/detect/:postalCode', async (req, res) => {
  try {
    const { postalCode } = req.params;
    
    console.log(`🔍 Detectando país para CP: ${postalCode}`);
    
    const countryInfo = shippingService.detectCountryFromPostalCode(postalCode);
    
    res.json({
      success: true,
      postalCode: postalCode,
      detected: countryInfo,
      message: `País detectado: ${countryInfo.countryName}`
    });
    
  } catch (error) {
    console.error('❌ Error detectando país:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/shipping/address/international/:postalCode
 * Obtiene información de dirección internacional
 */
router.get('/address/international/:postalCode', async (req, res) => {
  try {
    const { postalCode } = req.params;
    const { country } = req.query; // Parámetro opcional para forzar país
    
    console.log(`🌍 Obteniendo dirección internacional para CP: ${postalCode}`);
    if (country) {
      console.log(`🏳️  País forzado: ${country}`);
    }
    
    const addressInfo = await shippingService.getAddressFromPostalCodeInternational(postalCode, country);
    
    res.json({
      success: true,
      postalCode: postalCode,
      forcedCountry: country || null,
      address: addressInfo,
      metadata: {
        isGeneric: addressInfo.isGeneric || false,
        hasCoordinates: !!(addressInfo.latitude && addressInfo.longitude),
        source: addressInfo.isGeneric ? 'generic' : 'api'
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo dirección internacional:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/shipping/quote/international
 * Obtiene cotizaciones de envío internacionales
 */
router.post('/quote/international', async (req, res) => {
  try {
    const { cartId, postalCode, country } = req.body;
    
    // Validaciones
    if (!cartId) {
      return res.status(400).json({
        success: false,
        error: 'cartId es requerido'
      });
    }
    
    if (!postalCode) {
      return res.status(400).json({
        success: false,
        error: 'postalCode es requerido'
      });
    }
    
    console.log(`🌍 Cotización internacional solicitada:`);
    console.log(`   Cart ID: ${cartId}`);
    console.log(`   CP destino: ${postalCode}`);
    console.log(`   País forzado: ${country || 'Auto-detección'}`);
    
    const quoteResult = await shippingService.getShippingQuoteInternational(cartId, postalCode, country);
    
    if (quoteResult.success) {
      // Formatear cotizaciones para el frontend
      const formattedQuotations = shippingService.formatQuotationsForFrontend(quoteResult);
      
      res.json({
        success: true,
        international: true,
        country: {
          code: quoteResult.countryInfo.countryCode,
          name: quoteResult.countryInfo.countryName
        },
        address: {
          country: quoteResult.addressInfo.detected.country_name,
          state: quoteResult.addressInfo.detected.area_level1,
          city: quoteResult.addressInfo.detected.area_level2,
          area: quoteResult.addressInfo.detected.area_level3,
          postalCode: quoteResult.addressInfo.detected.postal_code,
          coordinates: quoteResult.addressInfo.hasCoordinates ? {
            lat: quoteResult.addressInfo.detected.latitude,
            lng: quoteResult.addressInfo.detected.longitude
          } : null,
          isGeneric: quoteResult.addressInfo.isGeneric
        },
        cart: {
          items: quoteResult.cartData.items,
          weight: quoteResult.cartData.totalWeight,
          dimensions: quoteResult.cartData.dimensions
        },
        quotations: formattedQuotations,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: '~50ms',
          dataQuality: quoteResult.addressInfo.isGeneric ? 'generic' : 'precise'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        international: true,
        error: quoteResult.error,
        details: quoteResult.details
      });
    }
    
  } catch (error) {
    console.error('❌ Error en cotización internacional:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/shipping/countries/supported
 * Lista países soportados por el sistema
 */
router.get('/countries/supported', (req, res) => {
  const supportedCountries = [
    { code: 'MX', name: 'México', level: 'complete', features: ['local_db', 'api', 'fallback'] },
    { code: 'BR', name: 'Brasil', level: 'advanced', features: ['viacep_api', 'zippopotam', 'fallback'] },
    { code: 'US', name: 'Estados Unidos', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'CA', name: 'Canadá', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'GB', name: 'Reino Unido', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'FR', name: 'Francia', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'DE', name: 'Alemania', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'ES', name: 'España', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'IT', name: 'Italia', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'AR', name: 'Argentina', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'CO', name: 'Colombia', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'CL', name: 'Chile', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'AU', name: 'Australia', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'IN', name: 'India', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'CN', name: 'China', level: 'basic', features: ['zippopotam', 'fallback'] },
    { code: 'JP', name: 'Japón', level: 'basic', features: ['zippopotam', 'fallback'] }
  ];
  
  const patterns = {
    MX: '5 dígitos (ej: 64000)',
    US: '5 dígitos o 5-4 (ej: 10001, 10001-1234)', 
    CA: 'A1A 1A1 (ej: M5V 3M6)',
    GB: 'Múltiples formatos (ej: SW1A 1AA)',
    FR: '5 dígitos (ej: 75001)',
    DE: '5 dígitos (ej: 10115)',
    ES: '5 dígitos (ej: 28001)',
    IT: '5 dígitos (ej: 00100)',
    BR: '00000-000 (ej: 01310-100)',
    AR: '4 dígitos (ej: 1001)',
    CO: '6 dígitos (ej: 110111)',
    CL: '7 dígitos (ej: 8320001)',
    AU: '4 dígitos (ej: 2000)',
    IN: '6 dígitos (ej: 110001)',
    CN: '6 dígitos (ej: 100000)',
    JP: '000-0000 (ej: 100-0001)'
  };
  
  res.json({
    success: true,
    totalCountries: supportedCountries.length,
    fallbackCoverage: 'global',
    countries: supportedCountries.map(country => ({
      ...country,
      pattern: patterns[country.code] || 'Variable'
    })),
    levels: {
      complete: 'Base de datos local + APIs + Fallbacks',
      advanced: 'APIs específicas + Zippopotam + Fallbacks', 
      basic: 'Zippopotam + Fallbacks',
      generic: 'Solo fallback genérico (cualquier país)'
    }
  });
});

/**
 * POST /api/shipping/test/international
 * Endpoint de prueba para validar el sistema internacional
 */
router.post('/test/international', async (req, res) => {
  try {
    const { testCases = [] } = req.body;
    
    if (testCases.length === 0) {
      // Casos de prueba por defecto
      testCases.push(
        { cp: '64000', country: null, description: 'México - Monterrey' },
        { cp: '10001', country: null, description: 'Estados Unidos - New York' },
        { cp: '75001', country: null, description: 'Francia - París' },
        { cp: 'SW1A 1AA', country: null, description: 'Reino Unido - Londres' },
        { cp: 'ABC123', country: null, description: 'Código inválido' }
      );
    }
    
    console.log(`🧪 Ejecutando ${testCases.length} pruebas internacionales...`);
    
    const results = [];
    
    for (const testCase of testCases) {
      const startTime = Date.now();
      
      try {
        const addressInfo = await shippingService.getAddressFromPostalCodeInternational(testCase.cp, testCase.country);
        const endTime = Date.now();
        
        results.push({
          test: testCase.description,
          postalCode: testCase.cp,
          forcedCountry: testCase.country,
          success: true,
          processingTime: `${endTime - startTime}ms`,
          result: {
            country: `${addressInfo.country_name} (${addressInfo.country_code})`,
            state: addressInfo.area_level1,
            city: addressInfo.area_level2,
            area: addressInfo.area_level3,
            coordinates: addressInfo.latitude && addressInfo.longitude ? 
              `${addressInfo.latitude}, ${addressInfo.longitude}` : null,
            isGeneric: addressInfo.isGeneric || false
          }
        });
        
      } catch (error) {
        const endTime = Date.now();
        
        results.push({
          test: testCase.description,
          postalCode: testCase.cp,
          forcedCountry: testCase.country,
          success: false,
          processingTime: `${endTime - startTime}ms`,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      testSummary: {
        total: results.length,
        successful: successCount,
        failed: errorCount,
        successRate: `${((successCount / results.length) * 100).toFixed(1)}%`
      },
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error en pruebas internacionales:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
