// models/size.model.js - Modelo para manejar sistemas de tallas y tallas

const db = require('../config/db');

class SizeModel {
  // Obtener todos los sistemas de tallas
  static async getAllSystems() {
    try {
      const query = `
        SELECT 
          st.*,
          json_agg(
            json_build_object(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'orden', t.orden
            ) ORDER BY t.orden
          ) FILTER (WHERE t.id_talla IS NOT NULL) as tallas
        FROM sistemas_talla st
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla
        GROUP BY st.id_sistema_talla
        ORDER BY st.nombre
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllSystems:', error);
      throw error;
    }
  }

  // Obtener un sistema de tallas específico con sus tallas
  static async getSystemById(id) {
    try {
      const query = `
        SELECT 
          st.*,
          json_agg(
            json_build_object(
              'id_talla', t.id_talla,
              'nombre_talla', t.nombre_talla,
              'orden', t.orden
            ) ORDER BY t.orden
          ) FILTER (WHERE t.id_talla IS NOT NULL) as tallas
        FROM sistemas_talla st
        LEFT JOIN tallas t ON st.id_sistema_talla = t.id_sistema_talla
        WHERE st.id_sistema_talla = $1
        GROUP BY st.id_sistema_talla
      `;
      
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error en getSystemById:', error);
      throw error;
    }
  }

  // Crear un nuevo sistema de tallas
  static async createSystem(nombre) {
    try {
      const query = 'INSERT INTO sistemas_talla (nombre) VALUES ($1) RETURNING *';
      const result = await db.query(query, [nombre]);
      return result.rows[0];
    } catch (error) {
      console.error('Error en createSystem:', error);
      throw error;
    }
  }

  // Actualizar un sistema de tallas
  static async updateSystem(id, nombre) {
    try {
      const query = 'UPDATE sistemas_talla SET nombre = $1 WHERE id_sistema_talla = $2 RETURNING *';
      const result = await db.query(query, [nombre, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Sistema de tallas no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateSystem:', error);
      throw error;
    }
  }

  // Eliminar un sistema de tallas
  static async deleteSystem(id) {
    try {
      const query = 'DELETE FROM sistemas_talla WHERE id_sistema_talla = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Sistema de tallas no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en deleteSystem:', error);
      throw error;
    }
  }

  // Crear una nueva talla
  static async createSize(id_sistema_talla, nombre_talla, orden) {
    try {
      const query = `
        INSERT INTO tallas (id_sistema_talla, nombre_talla, orden) 
        VALUES ($1, $2, $3) 
        RETURNING *
      `;
      const result = await db.query(query, [id_sistema_talla, nombre_talla, orden]);
      return result.rows[0];
    } catch (error) {
      console.error('Error en createSize:', error);
      throw error;
    }
  }

  // Actualizar una talla
  static async updateSize(id, nombre_talla, orden) {
    try {
      const query = `
        UPDATE tallas 
        SET nombre_talla = $1, orden = $2 
        WHERE id_talla = $3 
        RETURNING *
      `;
      const result = await db.query(query, [nombre_talla, orden, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Talla no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateSize:', error);
      throw error;
    }
  }

  // Eliminar una talla
  static async deleteSize(id) {
    try {
      const query = 'DELETE FROM tallas WHERE id_talla = $1 RETURNING *';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Talla no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en deleteSize:', error);
      throw error;
    }
  }

  // Obtener todas las tallas de un sistema específico
  static async getSizesBySystem(systemId) {
    try {
      const query = `
        SELECT * FROM tallas 
        WHERE id_sistema_talla = $1 
        ORDER BY orden
      `;
      const result = await db.query(query, [systemId]);
      return result.rows;
    } catch (error) {
      console.error('Error en getSizesBySystem:', error);
      throw error;
    }
  }

  // Obtener stock disponible por tallas para un producto-variante específico
  static async getStockByProductVariant(productId, variantId) {
    try {
      const query = `
        SELECT 
          s.*,
          t.nombre_talla,
          t.orden
        FROM stock s
        INNER JOIN tallas t ON s.id_talla = t.id_talla
        WHERE s.id_producto = $1 AND s.id_variante = $2 AND s.cantidad > 0
        ORDER BY t.orden
      `;
      const result = await db.query(query, [productId, variantId]);
      return result.rows;
    } catch (error) {
      console.error('Error en getStockByProductVariant:', error);
      throw error;
    }
  }

  // Actualizar stock
  static async updateStock(id_producto, id_variante, id_talla, cantidad) {
    try {
      const query = `
        INSERT INTO stock (id_producto, id_variante, id_talla, cantidad)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id_producto, id_variante, id_talla)
        DO UPDATE SET 
          cantidad = $4,
          fecha_actualizacion = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await db.query(query, [id_producto, id_variante, id_talla, cantidad]);
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateStock:', error);
      throw error;
    }
  }

  // Obtener todo el stock con información detallada
  static async getAllStock() {
    try {
      const query = `
        SELECT 
          s.*,
          p.nombre as producto_nombre,
          v.nombre as variante_nombre,
          v.precio,
          t.nombre_talla,
          st.nombre as sistema_nombre
        FROM stock s
        INNER JOIN productos p ON s.id_producto = p.id_producto
        INNER JOIN variantes v ON s.id_variante = v.id_variante
        INNER JOIN tallas t ON s.id_talla = t.id_talla
        INNER JOIN sistemas_talla st ON t.id_sistema_talla = st.id_sistema_talla
        ORDER BY p.nombre, v.nombre, t.orden
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllStock:', error);
      throw error;
    }
  }
}

module.exports = SizeModel;
