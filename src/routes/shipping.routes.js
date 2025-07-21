const express = require('express');
const { check } = require('express-validator');
const {
  getShippingInfo,
  createShippingInfo,
  updateShippingInfo,
  deleteShippingInfo
} = require('../controllers/shipping.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas necesitan autenticación
router.use(authMiddleware.verifyToken);

// @route   GET /api/shipping
// @desc    Obtener información de envío del usuario
// @access  Private
router.get('/', getShippingInfo);

// @route   POST /api/shipping
// @desc    Crear nueva información de envío
// @access  Private
router.post(
  '/',
  [
    // Todos los campos son opcionales para la información de envío
    check('nombre_completo', 'El nombre completo debe ser un texto válido').optional().isString(),
    check('telefono', 'El teléfono debe ser un texto válido').optional().isString(),
    check('direccion', 'La dirección debe ser un texto válido').optional().isString(),
    check('ciudad', 'La ciudad debe ser un texto válido').optional().isString(),
    check('estado', 'El estado debe ser un texto válido').optional().isString(),
    check('codigo_postal', 'El código postal debe ser un texto válido').optional().isString(),
    check('pais', 'El país debe ser un texto válido').optional().isString()
  ],
  createShippingInfo
);

// @route   PUT /api/shipping/:id
// @desc    Actualizar información de envío
// @access  Private
router.put(
  '/:id',
  [
    check('nombre_completo', 'El nombre completo debe ser un texto válido').optional().isString(),
    check('telefono', 'El teléfono debe ser un texto válido').optional().isString(),
    check('direccion', 'La dirección debe ser un texto válido').optional().isString(),
    check('ciudad', 'La ciudad debe ser un texto válido').optional().isString(),
    check('estado', 'El estado debe ser un texto válido').optional().isString(),
    check('codigo_postal', 'El código postal debe ser un texto válido').optional().isString(),
    check('pais', 'El país debe ser un texto válido').optional().isString()
  ],
  updateShippingInfo
);

// @route   DELETE /api/shipping/:id
// @desc    Eliminar información de envío
// @access  Private
router.delete('/:id', deleteShippingInfo);

module.exports = router;
