const express = require('express');
const { check, validationResult } = require('express-validator');
const { registerUser, loginUser, getUserProfile, logoutUser } = require('../controllers/auth.controller');
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
    check('contrasena', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    check('usuario', 'El nombre de usuario es obligatorio y debe tener al menos 3 caracteres').isLength({ min: 3 })
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

      await registerUser(req, res);
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
    check('usuario', 'El usuario o correo es obligatorio').not().isEmpty(),
    check('contrasena', 'La contraseña es obligatoria').exists()
  ],
  loginUser
);

// @route   GET /api/auth/profile
// @desc    Obtener perfil del usuario
// @access  Private
router.get('/profile', authMiddleware.verifyToken, getUserProfile);

// @route   POST /api/auth/logout
// @desc    Cerrar sesión del usuario
// @access  Private
router.post('/logout', authMiddleware.verifyToken, logoutUser);

module.exports = router;
