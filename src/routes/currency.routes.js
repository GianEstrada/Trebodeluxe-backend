// src/routes/currency.routes.js - Rutas para conversión de moneda
const express = require('express');
const router = express.Router();

// Tasas de cambio (en producción, esto vendría de una API externa como exchangerate-api.com)
const exchangeRates = {
  MXN: {
    USD: 0.060, // 1 MXN = 0.060 USD (aproximado)
    EUR: 0.055, // 1 MXN = 0.055 EUR (aproximado)
    MXN: 1.0
  },
  USD: {
    MXN: 16.70, // 1 USD = 16.70 MXN (aproximado)
    EUR: 0.92,  // 1 USD = 0.92 EUR (aproximado)
    USD: 1.0
  },
  EUR: {
    MXN: 18.20, // 1 EUR = 18.20 MXN (aproximado)
    USD: 1.09,  // 1 EUR = 1.09 USD (aproximado)
    EUR: 1.0
  }
};

// @route   GET /api/currency/rates
// @desc    Obtener todas las tasas de cambio
// @access  Public
router.get('/rates', (req, res) => {
  try {
    res.json({
      success: true,
      rates: exchangeRates,
      timestamp: new Date().toISOString(),
      base_currencies: ['MXN', 'USD', 'EUR']
    });
  } catch (error) {
    console.error('Error obteniendo tasas de cambio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las tasas de cambio',
      error: error.message
    });
  }
});

// @route   POST /api/currency/convert
// @desc    Convertir cantidad de una moneda a otra
// @access  Public
router.post('/convert', (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    // Validaciones
    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren amount, fromCurrency y toCurrency'
      });
    }

    if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
      return res.status(400).json({
        success: false,
        message: `Conversión no disponible de ${fromCurrency} a ${toCurrency}`
      });
    }

    const rate = exchangeRates[fromCurrency][toCurrency];
    const convertedAmount = parseFloat((amount * rate).toFixed(2));

    res.json({
      success: true,
      conversion: {
        original_amount: parseFloat(amount),
        converted_amount: convertedAmount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        exchange_rate: rate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en conversión de moneda:', error);
    res.status(500).json({
      success: false,
      message: 'Error al convertir moneda',
      error: error.message
    });
  }
});

// @route   GET /api/currency/rate/:from/:to
// @desc    Obtener tasa de cambio específica
// @access  Public
router.get('/rate/:from/:to', (req, res) => {
  try {
    const { from, to } = req.params;
    
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();

    if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
      return res.status(404).json({
        success: false,
        message: `Tasa de cambio no encontrada de ${fromCurrency} a ${toCurrency}`
      });
    }

    const rate = exchangeRates[fromCurrency][toCurrency];

    res.json({
      success: true,
      rate: {
        from: fromCurrency,
        to: toCurrency,
        value: rate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo tasa específica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la tasa de cambio',
      error: error.message
    });
  }
});

module.exports = router;
