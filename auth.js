const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'treboluxe_secret_key_2024';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

class AuthService {
  constructor() {
    this.db = new Database();
  }

  // Generar tokens JWT
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

    return { accessToken, refreshToken };
  }

  // Verificar token JWT
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  // Hash de contraseña
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Verificar contraseña
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Registro de usuario
  async register(userData) {
    try {
      // Validar datos requeridos
      const { email, password, firstName, lastName } = userData;
      
      if (!email || !password || !firstName || !lastName) {
        throw new Error('Todos los campos requeridos deben ser proporcionados');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Formato de email inválido');
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.db.getUserByEmail(email);
      if (existingUser) {
        throw new Error('Ya existe un usuario con este email');
      }

      // Hash de la contraseña
      const hashedPassword = await this.hashPassword(password);

      // Crear usuario
      const newUser = await this.db.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generar tokens
      const tokens = this.generateTokens(newUser);

      // Guardar refresh token en la base de datos
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      
      await this.db.saveToken(newUser.id, tokens.refreshToken, 'refresh', refreshExpiresAt);

      // Retornar usuario sin contraseña
      const { password: _, ...userWithoutPassword } = newUser;
      
      return {
        success: true,
        user: userWithoutPassword,
        tokens
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Inicio de sesión
  async login(email, password) {
    try {
      // Validar datos requeridos
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      // Buscar usuario
      const user = await this.db.getUserByEmail(email);
      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        throw new Error('Cuenta desactivada');
      }

      // Generar tokens
      const tokens = this.generateTokens(user);

      // Guardar refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      
      await this.db.saveToken(user.id, tokens.refreshToken, 'refresh', refreshExpiresAt);

      // Retornar usuario sin contraseña
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        tokens
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Renovar token
  async refreshToken(refreshToken) {
    try {
      // Verificar refresh token
      const payload = this.verifyToken(refreshToken);
      
      // Verificar si el token está en la base de datos y es válido
      const tokenRecord = await this.db.getValidToken(refreshToken, 'refresh');
      if (!tokenRecord) {
        throw new Error('Refresh token inválido');
      }

      // Obtener usuario actualizado
      const user = await this.db.getUserById(payload.id);
      if (!user || !user.isActive) {
        throw new Error('Usuario no encontrado o inactivo');
      }

      // Generar nuevos tokens
      const newTokens = this.generateTokens(user);

      // Marcar el token anterior como usado
      await this.db.markTokenAsUsed(tokenRecord.id);

      // Guardar nuevo refresh token
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);
      
      await this.db.saveToken(user.id, newTokens.refreshToken, 'refresh', refreshExpiresAt);

      return {
        success: true,
        tokens: newTokens
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener perfil de usuario
  async getUserProfile(userId) {
    try {
      const user = await this.db.getUserById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const { password: _, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Actualizar perfil de usuario
  async updateUserProfile(userId, updateData) {
    try {
      // Eliminar campos que no se pueden actualizar directamente
      const { id, password, role, createdAt, updatedAt, ...allowedFields } = updateData;

      if (Object.keys(allowedFields).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      // Si se incluye email, validar formato
      if (allowedFields.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(allowedFields.email)) {
          throw new Error('Formato de email inválido');
        }

        // Verificar que el email no esté en uso por otro usuario
        const existingUser = await this.db.getUserByEmail(allowedFields.email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Este email ya está en uso');
        }
      }

      // Actualizar usuario
      const result = await this.db.updateUser(userId, allowedFields);
      
      if (result.changes === 0) {
        throw new Error('Usuario no encontrado o sin cambios');
      }

      // Obtener usuario actualizado
      const updatedUser = await this.db.getUserById(userId);
      const { password: _, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        user: userWithoutPassword
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cambiar contraseña
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Validar datos
      if (!currentPassword || !newPassword) {
        throw new Error('Contraseña actual y nueva son requeridas');
      }

      if (newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
      }

      // Obtener usuario
      const user = await this.db.getUserById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Hash de la nueva contraseña
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Actualizar contraseña
      await this.db.updateUser(userId, { password: hashedNewPassword });

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const authService = new AuthService();
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar rol de admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
  }
  next();
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const authService = new AuthService();
      const decoded = authService.verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Token inválido pero continuamos sin usuario
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};

module.exports = {
  AuthService,
  authenticateToken,
  requireAdmin,
  optionalAuth
};
