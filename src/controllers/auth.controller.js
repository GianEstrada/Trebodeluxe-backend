const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const { generateToken } = require('../utils/tokenUtils');

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nombres, apellidos, correo, contrasena, usuario, shippingInfo } = req.body;

  // Iniciar transacción para mantener consistencia
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verificar si el correo ya existe
    const emailExists = await client.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (emailExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: 'El correo ya está registrado' 
      });
    }

    // Verificar si el nombre de usuario ya existe
    const usernameExists = await client.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (usernameExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false,
        message: 'El nombre de usuario ya está en uso' 
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Crear el usuario
    const userResult = await client.query(
      'INSERT INTO usuarios (nombres, apellidos, correo, contrasena, usuario) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, nombres, apellidos, correo, usuario, rol',
      [nombres, apellidos, correo, hashedPassword, usuario]
    );

    const newUser = userResult.rows[0];
    let shippingData = null;

    // Si se proporcionaron datos de envío, guardarlos
    if (shippingInfo && Object.keys(shippingInfo).length > 0) {
      const {
        nombre_completo,
        telefono,
        direccion,
        ciudad,
        estado,
        codigo_postal,
        pais
      } = shippingInfo;

      // Validar que todos los campos requeridos estén presentes
      if (nombre_completo && telefono && direccion && ciudad && estado && codigo_postal && pais) {
        const shippingResult = await client.query(
          `INSERT INTO informacion_envio 
           (id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING id_informacion, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais`,
          [newUser.id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais]
        );

        shippingData = shippingResult.rows[0];
        console.log('Información de envío guardada para usuario:', newUser.id_usuario);
      } else {
        console.log('Datos de envío incompletos, no se guardaron para usuario:', newUser.id_usuario);
      }
    }

    // Confirmar transacción
    await client.query('COMMIT');

    // Preparar respuesta
    const userData = {
      id_usuario: newUser.id_usuario,
      nombres: newUser.nombres,
      apellidos: newUser.apellidos,
      correo: newUser.correo,
      usuario: newUser.usuario,
      rol: newUser.rol
    };

    // Si hay datos de envío, incluirlos en la respuesta
    if (shippingData) {
      userData.shippingInfo = {
        id_informacion: shippingData.id_informacion,
        nombre_completo: shippingData.nombre_completo,
        telefono: shippingData.telefono,
        direccion: shippingData.direccion,
        ciudad: shippingData.ciudad,
        estado: shippingData.estado,
        codigo_postal: shippingData.codigo_postal,
        pais: shippingData.pais
      };
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: userData,
      token: generateToken(newUser.id_usuario)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar el usuario:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al registrar el usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// @desc    Autenticar un usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { usuario, contrasena } = req.body;

  try {
    // Verificar si el usuario existe (puede ser nombre de usuario o correo)
    const userResult = await db.query(
      'SELECT id_usuario, nombres, apellidos, correo, usuario, rol, contrasena FROM usuarios WHERE usuario = $1 OR correo = $1',
      [usuario]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    // Verificar si la contraseña coincide
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario o contraseña incorrectos' 
      });
    }

    // Obtener información de envío si existe
    const shippingResult = await db.query(
      'SELECT id_informacion, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais FROM informacion_envio WHERE id_usuario = $1',
      [user.id_usuario]
    );

    const userData = {
      id_usuario: user.id_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      usuario: user.usuario,
      rol: user.rol
    };

    // Si hay datos de envío, incluirlos
    if (shippingResult.rows.length > 0) {
      const shippingInfo = shippingResult.rows[0];
      userData.shippingInfo = {
        id_informacion: shippingInfo.id_informacion,
        nombre_completo: shippingInfo.nombre_completo,
        telefono: shippingInfo.telefono,
        direccion: shippingInfo.direccion,
        ciudad: shippingInfo.ciudad,
        estado: shippingInfo.estado,
        codigo_postal: shippingInfo.codigo_postal,
        pais: shippingInfo.pais
      };
    }

    res.json({
      success: true,
      user: userData,
      token: generateToken(user.id_usuario)
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al iniciar sesión' 
    });
  }
};

// @desc    Obtener datos del usuario
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // El middleware protect ya ha verificado y añadido el usuario a req.user
    res.json(req.user);
  } catch (error) {
    console.error('Error al obtener el perfil del usuario:', error);
    res.status(500).json({ message: 'Error al obtener el perfil del usuario' });
  }
};

// @desc    Cerrar sesión del usuario
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    // En un sistema con JWT stateless, no necesitamos hacer nada en el backend
    // El frontend simplemente eliminará el token del localStorage
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al cerrar sesión' 
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  logoutUser
};
