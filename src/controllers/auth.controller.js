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

  const { nombres, apellidos, correo, contrasena, usuario } = req.body;

  try {
    // Verificar si el correo ya existe
    const emailExists = await db.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (emailExists.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    // Verificar si el nombre de usuario ya existe
    const usernameExists = await db.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (usernameExists.rows.length > 0) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    // Crear el usuario
    const result = await db.query(
      'INSERT INTO usuarios (nombres, apellidos, correo, contrasena, usuario) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, nombres, apellidos, correo, usuario',
      [nombres, apellidos, correo, hashedPassword, usuario]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      id_usuario: newUser.id_usuario,
      nombres: newUser.nombres,
      apellidos: newUser.apellidos,
      correo: newUser.correo,
      usuario: newUser.usuario,
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

  const { usuario, contrasena } = req.body;

  try {
    // Verificar si el usuario existe (puede ser nombre de usuario o correo)
    const result = await db.query(
      'SELECT * FROM usuarios WHERE usuario = $1 OR correo = $1',
      [usuario]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Verificar si la contraseña coincide
    const isMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!isMatch) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    res.json({
      id_usuario: user.id_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      usuario: user.usuario,
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
