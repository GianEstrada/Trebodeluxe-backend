const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const db = require('../config/db');

// @desc    Actualizar información del usuario
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
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
