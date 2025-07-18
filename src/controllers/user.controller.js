const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');
const ShippingInfoModel = require('../models/shipping.model');

// Controlador de usuarios
const UserController = {
  // Registro de usuario
  async register(req, res) {
    try {
      console.log('Iniciando registro de usuario');
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Errores de validación:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      console.log('Datos recibidos:', { ...req.body, password: '[REDACTED]' });
      const { nombres, apellidos, correo, contrasena } = req.body;

      // Validar campos requeridos
      if (!nombres || !apellidos || !correo || !contrasena) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar si el usuario ya existe
      const exists = await UserModel.checkExists(correo);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'El email o nombre de usuario ya está registrado'
        });
      }

      // Crear el usuario
      const user = await UserModel.create({
        nombres,
        apellidos,
        email: correo,
        password: contrasena
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
  },

  // Actualizar perfil de usuario
  async updateUserProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const { nombres, apellidos, correo, contrasena } = req.body;

      // Verificar si el usuario existe
      const user = await UserModel.getById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Actualizar usuario
      const updatedUser = await UserModel.update(userId, {
        nombres,
        apellidos,
        email: correo,
        password: contrasena // Se encriptará en el modelo si está presente
      });

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          nombres: updatedUser.nombres,
          apellidos: updatedUser.apellidos
        }
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar perfil de usuario'
      });
    }
  },

  // Eliminar usuario
  async deleteUser(req, res) {
    try {
      const userId = req.user.id;
      
      // Verificar si el usuario existe
      const user = await UserModel.getById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Eliminar usuario
      await UserModel.delete(userId);

      res.json({
        success: true,
        message: 'Cuenta eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar cuenta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar cuenta de usuario'
      });
    }
  }
};

module.exports = UserController;