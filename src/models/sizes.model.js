const db = require('../config/db');


const SizesModel = {
  async getAllSystems() {
    console.log('SizesModel.getAllSystems ejecutándose');
    try {
      const result = await db.query(`
        SELECT st.*, 
               array_agg(
                 json_build_object(
                   'id_talla', t.id_talla, 
                   'nombre_talla', t.nombre_talla, 
                   'orden', t.orden
                 ) ORDER BY t.orden
               ) as tallas 
        FROM sistemas_talla st 
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla 
        GROUP BY st.id_sistema_talla 
        ORDER BY st.nombre
      `);
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
    console.log('SizesModel.createSystem ejecutándose');
    try {
      const { nombre, tallas } = data;
      
      // Crear el sistema de tallas
      const systemResult = await db.query(
        'INSERT INTO sistemas_talla (nombre) VALUES ($1) RETURNING *',
        [nombre]
      );
      
      const systemId = systemResult.rows[0].id_sistema_talla;
      
      // Insertar las tallas si se proporcionaron
      if (tallas && tallas.length > 0) {
        for (let i = 0; i < tallas.length; i++) {
          if (tallas[i].trim()) {
            await db.query(
              'INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES ($1, $2, $3)',
              [systemId, tallas[i].trim(), i + 1]
            );
          }
        }
      }
      
      // Obtener el sistema completo con sus tallas
      const result = await db.query(`
        SELECT st.*, 
               array_agg(
                 json_build_object(
                   'id_talla', t.id_talla, 
                   'nombre_talla', t.nombre_talla, 
                   'orden', t.orden
                 ) ORDER BY t.orden
               ) as tallas 
        FROM sistemas_talla st 
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla 
        WHERE st.id_sistema_talla = $1 
        GROUP BY st.id_sistema_talla
      `, [systemId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en createSystem:', error);
      throw error;
    }
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
      const result = await db.query('DELETE FROM tallas WHERE id_talla = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error en deleteSize:', error);
      throw error;
    }
  },

  async searchSystems(search) {
    console.log('SizesModel.searchSystems ejecutándose con:', search);
    try {
      const query = search 
        ? 'SELECT st.*, array_agg(json_build_object(\'id_talla\', t.id_talla, \'nombre_talla\', t.nombre_talla, \'orden\', t.orden) ORDER BY t.orden) as tallas FROM sistemas_talla st LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla WHERE st.nombre ILIKE $1 GROUP BY st.id_sistema_talla ORDER BY st.nombre'
        : 'SELECT st.*, array_agg(json_build_object(\'id_talla\', t.id_talla, \'nombre_talla\', t.nombre_talla, \'orden\', t.orden) ORDER BY t.orden) as tallas FROM sistemas_talla st LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla GROUP BY st.id_sistema_talla ORDER BY st.nombre';
      
      const params = search ? [`%${search}%`] : [];
      const result = await db.query(query, params);
      console.log('Sistemas encontrados en búsqueda:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('Error en searchSystems:', error);
      throw error;
    }
  },

  async updateSystem(id, data) {
    console.log('SizesModel.updateSystem ejecutándose');
    try {
      const { nombre, tallas } = data;
      
      // Actualizar el nombre del sistema
      await db.query('UPDATE sistemas_talla SET nombre = $1 WHERE id_sistema_talla = $2', [nombre, id]);
      
      // Eliminar las tallas existentes
      await db.query('DELETE FROM tallas WHERE id_sistema_talla = $1', [id]);
      
      // Insertar las nuevas tallas
      if (tallas && tallas.length > 0) {
        for (let i = 0; i < tallas.length; i++) {
          if (tallas[i].trim()) {
            await db.query(
              'INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES ($1, $2, $3)',
              [id, tallas[i].trim(), i + 1]
            );
          }
        }
      }
      
      // Obtener el sistema actualizado con sus tallas
      const result = await db.query(`
        SELECT st.*, array_agg(json_build_object('id_talla', t.id_talla, 'nombre_talla', t.nombre_talla, 'orden', t.orden) ORDER BY t.orden) as tallas 
        FROM sistemas_talla st 
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla 
        WHERE st.id_sistema_talla = $1 
        GROUP BY st.id_sistema_talla
      `, [id]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateSystem:', error);
      throw error;
    }
  },

  async deleteSystem(id) {
    console.log('SizesModel.deleteSystem ejecutándose');
    try {
      // Primero eliminar las tallas del sistema
      await db.query('DELETE FROM tallas WHERE id_sistema_talla = $1', [id]);
      
      // Luego eliminar el sistema
      const result = await db.query('DELETE FROM sistemas_talla WHERE id_sistema_talla = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error en deleteSystem:', error);
      throw error;
    }
  }
};

module.exports = SizesModel;
