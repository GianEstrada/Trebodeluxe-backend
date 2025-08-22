const express = require('express');
const router = express.Router();
const DiscountCodeController = require('../controllers/discountCode.controller');

// Rutas públicas (para checkout)
router.post('/validate/:codigo', DiscountCodeController.validateCode);
router.post('/apply/:codigo', DiscountCodeController.applyCode);
router.get('/active', DiscountCodeController.getActiveCodes);

// Rutas administrativas
router.post('/create-table', DiscountCodeController.createTable);
router.get('/admin/all', DiscountCodeController.getAllCodes);
router.post('/admin/create', DiscountCodeController.createCode);
router.put('/admin/update/:id', DiscountCodeController.updateCode);
router.delete('/admin/delete/:id', DiscountCodeController.deleteCode);
router.get('/admin/:id', DiscountCodeController.getCodeById);

module.exports = router;
