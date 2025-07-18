const { pool } = require('../config/db');

const ShippingInfoModel = {
  // Crear o actualizar información de envío
  async upsert({
    usuario_id,
    nombre_completo,
    telefono,
    direccion,
    ciudad,
    estado,
    codigo_postal,
    pais
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar si ya existe información para este usuario
      const existingInfo = await client.query(
        'SELECT id FROM informacion_envio WHERE usuario_id = $1',
        [usuario_id]
      );

      let result;
      if (existingInfo.rows.length > 0) {
        // Actualizar información existente
        result = await client.query(
          `UPDATE informacion_envio 
           SET nombre_completo = $1,
               telefono = $2,
               direccion = $3,
               ciudad = $4,
               estado = $5,
               codigo_postal = $6,
               pais = $7,
               ultima_actualizacion = CURRENT_TIMESTAMP
           WHERE usuario_id = $8
           RETURNING *`,
          [nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais, usuario_id]
        );
      } else {
        // Insertar nueva información
        result = await client.query(
          `INSERT INTO informacion_envio 
           (usuario_id, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [usuario_id, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais]
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Obtener información de envío por ID de usuario
  async getByUserId(usuario_id) {
    const result = await pool.query(
      'SELECT * FROM informacion_envio WHERE usuario_id = $1',
      [usuario_id]
    );
    return result.rows[0];
  }
};

module.exports = ShippingInfoModel;
