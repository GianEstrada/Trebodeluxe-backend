const db = require('../config/db');

const SizesModel = {
  async getAllSystems() {
    const result = await db.query('SELECT * FROM sistemas_talla WHERE activo = true ORDER BY nombre_sistema');
    return result.rows;
  },
  async getAllSizes() {
    const result = await db.query('SELECT * FROM tallas WHERE activo = true ORDER BY nombre_talla');
    return result.rows;
  },
  async createSystem(data) {
    const { nombre_sistema, descripcion } = data;
    const result = await db.query(
      'INSERT INTO sistemas_talla (nombre_sistema, descripcion, activo) VALUES ($1, $2, true) RETURNING *',
      [nombre_sistema, descripcion]
    );
    return result.rows[0];
  },
  async createSize(data) {
    const { id_sistema_talla, nombre_talla, abreviacion, orden, activo } = data;
    const result = await db.query(
      'INSERT INTO tallas (id_sistema_talla, nombre_talla, abreviacion, orden, activo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id_sistema_talla, nombre_talla, abreviacion, orden, activo]
    );
    return result.rows[0];
  }
};

module.exports = SizesModel;
