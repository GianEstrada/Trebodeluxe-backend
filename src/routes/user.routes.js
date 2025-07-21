const express = require('express');
const { check } = require('express-validator');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// @route   PUT /api/users/profile
// @desc    Actualizar perfil de usuario
// @access  Private
router.put(
  '/profile',
  authMiddleware.verifyToken,
  [
    check('nombres', 'El nombre es obligatorio').not().isEmpty(),
    check('apellidos', 'Los apellidos son obligatorios').not().isEmpty(),
    check('correo', 'Por favor incluya un correo válido').isEmail(),
    // La contraseña es opcional en las actualizaciones
    check('contrasena', 'La contraseña debe tener al menos 6 caracteres').optional().isLength({ min: 6 })
  ],
  UserController.updateUserProfile
);

// @route   DELETE /api/users
// @desc    Eliminar cuenta de usuario
// @access  Private
router.delete('/', authMiddleware.verifyToken, UserController.deleteUser);

module.exports = router;
