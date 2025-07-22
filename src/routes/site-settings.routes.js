// routes/site-settings.routes.js - Rutas para configuraciones del sitio

const express = require('express');
const router = express.Router();
const SiteSettingsController = require('../controllers/site-settings.controller');

// Rutas públicas (para obtener configuraciones)
router.get('/header', SiteSettingsController.getHeaderSettings);
router.get('/setting/:key', SiteSettingsController.getSetting);

// Rutas administrativas (requieren autenticación)
router.get('/all', SiteSettingsController.getAllSettings);
router.put('/header', SiteSettingsController.updateHeaderSettings);
router.put('/setting/:key', SiteSettingsController.updateSetting);

module.exports = router;
