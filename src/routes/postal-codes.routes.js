// src/routes/postal-codes.routes.js
const express = require('express');
const router = express.Router();
const postalCodesService = require('../services/postal-codes.service');

// GET /api/postal-codes/colonias/:cp - Obtener colonias por código postal
router.get('/colonias/:cp', (req, res) => {
  try {
    const { cp } = req.params;
    
    console.log(`🔍 [POSTAL] Buscando colonias para CP: ${cp}`);
    
    const result = postalCodesService.getColoniasByCP(cp);
    
    if (result.success) {
      console.log(`✅ [POSTAL] Encontradas ${result.colonias.length} colonias para CP ${cp}`);
      res.json(result);
    } else {
      console.log(`❌ [POSTAL] CP ${cp} no encontrado`);
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('❌ [POSTAL] Error en endpoint colonias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/postal-codes/info/:cp - Obtener información completa por CP
router.get('/info/:cp', (req, res) => {
  try {
    const { cp } = req.params;
    
    console.log(`🔍 [POSTAL] Buscando información completa para CP: ${cp}`);
    
    const result = postalCodesService.getInfoByCP(cp);
    
    if (result.success) {
      console.log(`✅ [POSTAL] Información encontrada para CP ${cp}: ${result.estado}, ${result.municipio}`);
      res.json(result);
    } else {
      console.log(`❌ [POSTAL] CP ${cp} no encontrado`);
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('❌ [POSTAL] Error en endpoint info:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/postal-codes/validate/:cp - Validar código postal
router.get('/validate/:cp', (req, res) => {
  try {
    const { cp } = req.params;
    
    const isValid = postalCodesService.isValidCP(cp);
    
    res.json({
      success: true,
      codigo_postal: cp,
      valido: isValid
    });
  } catch (error) {
    console.error('❌ [POSTAL] Error en endpoint validate:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// GET /api/postal-codes/stats - Obtener estadísticas
router.get('/stats', (req, res) => {
  try {
    const stats = postalCodesService.getStats();
    
    res.json({
      success: true,
      estadisticas: stats
    });
  } catch (error) {
    console.error('❌ [POSTAL] Error en endpoint stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

module.exports = router;
