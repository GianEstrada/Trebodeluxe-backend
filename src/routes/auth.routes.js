const express = require('express');
const { check, validationResult } = require('express-validator');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Registrar un nuevo usuario
// @access  Public
router.post(
  '/register',
  [
    check('nombres', 'El nombre es obligatorio').not().isEmpty(),
    check('apellidos', 'Los apellidos son obligatorios').not().isEmpty(),
    check('correo', 'Por favor incluye un email válido').isEmail(),
    check('contrasena', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      // Log detailed request information
      console.log('=== Registro de Usuario ===');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('Method:', req.method);
      console.log('URL:', req.originalUrl);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Errores de validación:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      await UserController.register(req, res);
    } catch (error) {
      console.error('Error detallado en el registro:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });
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
    check('correo', 'El correo es obligatorio').isEmail(),
    check('contrasena', 'La contraseña es obligatoria').exists()
  ],
  UserController.login
);

// @route   GET /api/auth/profile
// @desc    Obtener perfil del usuario
// @access  Private
router.get('/profile', authMiddleware, UserController.getProfile);

module.exports = router;
