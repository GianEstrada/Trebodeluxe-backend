const db = require('../config/db');


const SizesModel = {
  async getAllSystems() {
    console.log('SizesModel.getAllSystems ejecutándose');
    try {
      const result = await db.query('SELECT * FROM sistemas_talla ORDER BY nombre');
      console.log('Sistemas encontrados:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllSystems:', error);
      throw error;
    }
  },
  async getAllSizes() {
    console.log('SizesModel.getAllSizes ejecutándose');
    try {
      const result = await db.query('SELECT * FROM tallas ORDER BY nombre_talla');
      console.log('Tallas encontradas:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllSizes:', error);
      throw error;
    }
  },
  async createSystem(data) {
    const { nombre } = data;
    const result = await db.query(
      'INSERT INTO sistemas_talla (nombre) VALUES ($1) RETURNING *',
      [nombre]
    );
    return result.rows[0];
  },
  async createSize(data) {
    const { id_sistema_talla, nombre_talla, orden } = data;
    const result = await db.query(
      'INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES ($1, $2, $3) RETURNING *',
      [id_sistema_talla, nombre_talla, orden]
    );
    return result.rows[0];
  },
  async deleteSize(id) {
    try {
      const result = await db.query('DELETE FROM tallas WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error en deleteSize:', error);
      throw error;
    }
  }
};

module.exports = SizesModel;
