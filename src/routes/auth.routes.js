const express = require('express');
const { check } = require('express-validator');
const { registerUser, loginUser, getUserProfile } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post(
  '/register',
  [
    check('nombres', 'El nombre es obligatorio').not().isEmpty(),
    check('apellidos', 'Los apellidos son obligatorios').not().isEmpty(),
    check('correo', 'Por favor incluye un correo válido').isEmail(),
    check('contrasena', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
  ],
  registerUser
);

// @route   POST /api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post(
  '/login',
  [
    check('correo', 'Por favor incluye un correo válido').isEmail(),
    check('contrasena', 'La contraseña es obligatoria').exists()
  ],
  loginUser
);

// @route   GET /api/auth/profile
// @desc    Obtener perfil del usuario
// @access  Private
router.get('/profile', protect, getUserProfile);

module.exports = router;
