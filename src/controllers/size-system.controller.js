// controllers/size-system.controller.js - Controlador para CRUD de sistemas de tallas

const db = require('../config/db');

const SizeSystemController = {
  // Obtener todos los sistemas de tallas con sus tallas
  getAllSizeSystems: async (req, res) => {
    try {
      const query = `
        SELECT 
          st.id_sistema_talla,
          st.nombre as sistema_nombre,
          json_agg(
            json_build_object(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'orden', t.orden
            ) ORDER BY t.orden
          ) as tallas
        FROM sistemas_talla st
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla
        GROUP BY st.id_sistema_talla, st.nombre
        ORDER BY st.nombre
      `;

      const result = await db.pool.query(query);
      
      // Limpiar datos para frontend
      const systems = result.rows.map(row => ({
        id_sistema_talla: row.id_sistema_talla,
        nombre: row.sistema_nombre,
        tallas: row.tallas.filter(talla => talla.id_talla !== null) || []
      }));

      res.json({
        success: true,
        sizeSystems: systems
      });
    } catch (error) {
      console.error('Error fetching size systems:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los sistemas de tallas',
        error: error.message
      });
    }
  },

  // Buscar sistemas de tallas
  searchSizeSystems: async (req, res) => {
    try {
      const { search } = req.query;
      
      let query = `
        SELECT 
          st.id_sistema_talla,
          st.nombre as sistema_nombre,
          json_agg(
            json_build_object(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'orden', t.orden
            ) ORDER BY t.orden
          ) as tallas
        FROM sistemas_talla st
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla
      `;

      let params = [];
      
      if (search) {
        query += ` WHERE st.nombre ILIKE $1`;
        params.push(`%${search}%`);
      }

      query += `
        GROUP BY st.id_sistema_talla, st.nombre
        ORDER BY st.nombre
      `;

      const result = await db.pool.query(query, params);
      
      const systems = result.rows.map(row => ({
        id_sistema_talla: row.id_sistema_talla,
        nombre: row.sistema_nombre,
        tallas: row.tallas.filter(talla => talla.id_talla !== null) || []
      }));

      res.json({
        success: true,
        sizeSystems: systems
      });
    } catch (error) {
      console.error('Error searching size systems:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar sistemas de tallas',
        error: error.message
      });
    }
  },

  // Crear nuevo sistema de tallas
  createSizeSystem: async (req, res) => {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { nombre, tallas } = req.body;

      // Validar datos
      if (!nombre || !Array.isArray(tallas) || tallas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del sistema y al menos una talla son requeridos'
        });
      }

      // Verificar si ya existe un sistema con ese nombre
      const existingSystem = await client.query(
        'SELECT id_sistema_talla FROM sistemas_talla WHERE LOWER(nombre) = LOWER($1)',
        [nombre]
      );

      if (existingSystem.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Ya existe un sistema de tallas con ese nombre'
        });
      }

      // Crear el sistema de tallas
      const systemResult = await client.query(
        'INSERT INTO sistemas_talla (nombre) VALUES ($1) RETURNING id_sistema_talla',
        [nombre]
      );

      const systemId = systemResult.rows[0].id_sistema_talla;

      // Insertar las tallas
      for (let i = 0; i < tallas.length; i++) {
        const talla = tallas[i];
        if (talla && talla.trim()) {
          await client.query(
            'INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES ($1, $2, $3)',
            [systemId, talla.trim(), i + 1]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Sistema de tallas creado exitosamente',
        systemId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating size system:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el sistema de tallas',
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Actualizar sistema de tallas
  updateSizeSystem: async (req, res) => {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const { nombre, tallas } = req.body;

      // Validar datos
      if (!nombre || !Array.isArray(tallas) || tallas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del sistema y al menos una talla son requeridos'
        });
      }

      // Verificar que el sistema existe
      const existingSystem = await client.query(
        'SELECT id_sistema_talla FROM sistemas_talla WHERE id_sistema_talla = $1',
        [id]
      );

      if (existingSystem.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Sistema de tallas no encontrado'
        });
      }

      // Verificar si ya existe otro sistema con ese nombre
      const duplicateCheck = await client.query(
        'SELECT id_sistema_talla FROM sistemas_talla WHERE LOWER(nombre) = LOWER($1) AND id_sistema_talla != $2',
        [nombre, id]
      );

      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro sistema de tallas con ese nombre'
        });
      }

      // Actualizar el nombre del sistema
      await client.query(
        'UPDATE sistemas_talla SET nombre = $1 WHERE id_sistema_talla = $2',
        [nombre, id]
      );

      // Eliminar todas las tallas existentes del sistema
      await client.query(
        'DELETE FROM tallas WHERE id_sistema_talla = $1',
        [id]
      );

      // Insertar las nuevas tallas
      for (let i = 0; i < tallas.length; i++) {
        const talla = tallas[i];
        if (talla && talla.trim()) {
          await client.query(
            'INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) VALUES ($1, $2, $3)',
            [id, talla.trim(), i + 1]
          );
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Sistema de tallas actualizado exitosamente'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating size system:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el sistema de tallas',
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Eliminar sistema de tallas
  deleteSizeSystem: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que el sistema existe
      const existingSystem = await db.pool.query(
        'SELECT id_sistema_talla FROM sistemas_talla WHERE id_sistema_talla = $1',
        [id]
      );

      if (existingSystem.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sistema de tallas no encontrado'
        });
      }

      // Verificar si hay productos usando este sistema
      const productsUsing = await db.pool.query(
        'SELECT COUNT(*) as count FROM productos WHERE id_sistema_talla = $1',
        [id]
      );

      if (parseInt(productsUsing.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el sistema de tallas porque está siendo usado por productos'
        });
      }

      // Eliminar el sistema (las tallas se eliminan automáticamente por CASCADE)
      await db.pool.query(
        'DELETE FROM sistemas_talla WHERE id_sistema_talla = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Sistema de tallas eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error deleting size system:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el sistema de tallas',
        error: error.message
      });
    }
  }
};

module.exports = SizeSystemController;
