const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const UserModel = {
  // Crear un nuevo usuario
  async create({ username, nombres, apellidos, email, password }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Encriptar la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Insertar el usuario
      const userResult = await client.query(
        `INSERT INTO usuarios (username, nombres, apellidos, email, password) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, username, nombres, apellidos, email, fecha_registro`,
        [username, nombres, apellidos, email, hashedPassword]
      );

      await client.query('COMMIT');
      return userResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Verificar credenciales de usuario
  async verifyCredentials(username, password) {
    const result = await pool.query(
      'SELECT id, username, password FROM usuarios WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username
    };
  },

  // Obtener usuario por ID
  async getById(id) {
    const result = await pool.query(
      `SELECT id, username, nombres, apellidos, email, fecha_registro 
       FROM usuarios 
       WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Verificar si existe un email o username
  async checkExists(email, username) {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM usuarios 
       WHERE email = $1 OR username = $2`,
      [email, username]
    );
    return result.rows[0].count > 0;
  }
};

module.exports = UserModel;
