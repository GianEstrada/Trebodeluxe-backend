const bcrypt = require('bcrypt');
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

  const { nombres, apellidos, correo, contrasena } = req.body;

  try {
    // Verificar si el usuario ya existe
    const userExists = await db.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Crear el usuario
    const result = await db.query(
      'INSERT INTO usuarios (nombres, apellidos, correo, contrasena) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombres, apellidos, correo',
      [nombres, apellidos, correo, hashedPassword]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      id_usuario: newUser.id_usuario,
      nombres: newUser.nombres,
      apellidos: newUser.apellidos,
      correo: newUser.correo,
      token: generateToken(newUser.id_usuario)
    });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
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

  const { correo, contrasena } = req.body;

  try {
    // Verificar si el usuario existe
    const result = await db.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    // Verificar si la contraseña coincide
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!isMatch) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }

    res.json({
      id_usuario: user.id_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      token: generateToken(user.id_usuario)
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
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

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};
