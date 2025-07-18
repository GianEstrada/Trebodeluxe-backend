const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');
const ShippingInfoModel = require('../models/shipping.model');

const UserController = {
  // Registro de usuario
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { username, nombres, apellidos, email, password } = req.body;

      // Validar campos requeridos
      if (!username || !nombres || !apellidos || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar si el usuario ya existe
      const exists = await UserModel.checkExists(email, username);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'El email o nombre de usuario ya está registrado'
        });
      }

      // Crear el usuario
      const user = await UserModel.create({
        username,
        nombres,
        apellidos,
        email,
        password
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombres: user.nombres,
          apellidos: user.apellidos
        }
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el usuario'
      });
    }
  },

  // Login de usuario
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Usuario y contraseña son requeridos'
        });
      }

      const user = await UserModel.verifyCredentials(username, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión'
      });
    }
  },

  // Obtener perfil de usuario
  async getProfile(req, res) {
    try {
      const userId = req.user.id; // Viene del middleware de autenticación
      const user = await UserModel.getById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener información de envío
      const shippingInfo = await ShippingInfoModel.getByUserId(userId);

      res.json({
        success: true,
        user: {
          ...user,
          shipping_info: shippingInfo || null
        }
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener perfil de usuario'
      });
    }
  }
};

module.exports = UserController;
    return res.status(400).json({ errors: errors.array() });
  }

  const { nombres, apellidos, correo, contrasena } = req.body;
  const userId = req.user.id_usuario;

  try {
    let query, params;

    // Si se proporciona una nueva contraseña, actualizarla también
    if (contrasena) {
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
      const hashedPassword = await bcrypt.hash(contrasena, salt);
      
      query = `
        UPDATE usuarios 
        SET nombres = $1, apellidos = $2, correo = $3, contrasena = $4 
        WHERE id_usuario = $5 
        RETURNING id_usuario, nombres, apellidos, correo
      `;
      params = [nombres, apellidos, correo, hashedPassword, userId];
    } else {
      query = `
        UPDATE usuarios 
        SET nombres = $1, apellidos = $2, correo = $3 
        WHERE id_usuario = $4 
        RETURNING id_usuario, nombres, apellidos, correo
      `;
      params = [nombres, apellidos, correo, userId];
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar el perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users
// @access  Private
const deleteUser = async (req, res) => {
  const userId = req.user.id_usuario;

  try {
    // Primero eliminar las direcciones de envío asociadas (por si acaso la cascada no funciona)
    await db.query('DELETE FROM informacion_envio WHERE id_usuario = $1', [userId]);
    
    // Luego eliminar al usuario
    const result = await db.query('DELETE FROM usuarios WHERE id_usuario = $1 RETURNING id_usuario', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).json({ message: 'Error al eliminar el usuario' });
  }
};

module.exports = {
  updateUserProfile,
  deleteUser
};
