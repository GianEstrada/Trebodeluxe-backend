const express = require('express');
const { check } = require('express-validator');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post(
  '/register',
  [
    check('username', 'El nombre de usuario es obligatorio').not().isEmpty(),
    check('nombres', 'El nombre es obligatorio').not().isEmpty(),
    check('apellidos', 'Los apellidos son obligatorios').not().isEmpty(),
    check('email', 'Por favor incluye un email válido').isEmail(),
    check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    console.log('Cuerpo de la solicitud:', req.body); // Log request body
    try {
      await UserController.register(req, res);
    } catch (error) {
      console.error('Error en el registro:', error); // Log any errors
      next(error);
    }
  }
);

// @route   POST /api/auth/login
// @desc    Autenticar usuario y obtener token
// @access  Public
router.post(
  '/login',
  [
    check('username', 'El nombre de usuario es obligatorio').not().isEmpty(),
    check('password', 'La contraseña es obligatoria').exists()
  ],
  UserController.login
);

// @route   GET /api/auth/profile
// @desc    Obtener perfil del usuario
// @access  Private
router.get('/profile', authMiddleware, UserController.getProfile);

module.exports = router;
