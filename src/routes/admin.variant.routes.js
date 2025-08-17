const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middlewares/auth-activity.middleware');
const AdminVariantController = require('../controllers/admin.variant.controller');

// Middleware para todas las rutas de admin
router.use(verifyToken);
router.use(requireAdmin);

// Obtener variante específica
router.get('/:id', AdminVariantController.getVariantById);

// Crear nueva variante
router.post('/', AdminVariantController.createVariant);

// Actualizar variante
router.put('/:id', AdminVariantController.updateVariant);

// Eliminar variante
router.delete('/:id', AdminVariantController.deleteVariant);

module.exports = router;
