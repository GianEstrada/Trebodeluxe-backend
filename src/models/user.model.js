const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const UserModel = {
  // Crear un nuevo usuario
  async create({ username, nombres, apellidos, email, password }) {
    console.log('Iniciando creación de usuario en la base de datos');
    const client = await pool.connect();
    try {
      console.log('Conexión a la base de datos establecida');
      await client.query('BEGIN');
      
      // Encriptar la contraseña
      console.log('Encriptando contraseña...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Insertar el usuario
      const userResult = await client.query(
        `INSERT INTO usuarios (nombres, apellidos, correo, contrasena) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id_usuario, nombres, apellidos, correo, fecha_creacion`,
        [nombres, apellidos, email, hashedPassword]
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
  async verifyCredentials(correo, password) {
    const result = await pool.query(
      'SELECT id_usuario, correo, contrasena FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.contrasena);

    if (!isValid) {
      return null;
    }

    return {
      id_usuario: user.id_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo
    };
  },

  // Obtener usuario por ID
  async getById(id) {
    const result = await pool.query(
      `SELECT id_usuario, nombres, apellidos, correo, fecha_creacion 
       FROM usuarios 
       WHERE id_usuario = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Verificar si existe un correo
  async checkExists(email) {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM usuarios 
       WHERE correo = $1`,
      [email]
    );
    return result.rows[0].count > 0;
  }
};

module.exports = UserModel;
