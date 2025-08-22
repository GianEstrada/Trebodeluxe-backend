const pool = require('../config/database');

class DiscountCodeModel {
  
  /**
   * Crear tabla de códigos de descuento
   */
  static async createTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS codigos_descuento (
          id_codigo SERIAL PRIMARY KEY,
          codigo VARCHAR(50) UNIQUE NOT NULL,
          descripcion TEXT,
          tipo_descuento VARCHAR(20) NOT NULL CHECK (tipo_descuento IN ('porcentaje', 'monto_fijo')),
          valor_descuento DECIMAL(10,2) NOT NULL,
          monto_minimo DECIMAL(10,2) DEFAULT 0,
          usos_maximos INTEGER DEFAULT NULL,
          usos_actuales INTEGER DEFAULT 0,
          activo BOOLEAN DEFAULT true,
          fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_fin TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await pool.query(query);
      console.log('✅ Tabla codigos_descuento creada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error creando tabla codigos_descuento:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los códigos de descuento
   */
  static async getAll() {
    try {
      const query = `
        SELECT 
          id_codigo,
          codigo,
          descripcion,
          tipo_descuento,
          valor_descuento,
          monto_minimo,
          usos_maximos,
          usos_actuales,
          activo,
          fecha_inicio,
          fecha_fin,
          created_at,
          updated_at
        FROM codigos_descuento 
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo códigos de descuento:', error);
      throw error;
    }
  }

  /**
   * Obtener códigos de descuento activos
   */
  static async getActive() {
    try {
      const query = `
        SELECT 
          id_codigo,
          codigo,
          descripcion,
          tipo_descuento,
          valor_descuento,
          monto_minimo,
          usos_maximos,
          usos_actuales,
          activo,
          fecha_inicio,
          fecha_fin
        FROM codigos_descuento 
        WHERE activo = true
          AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_TIMESTAMP)
          AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_TIMESTAMP)
          AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo códigos activos:', error);
      throw error;
    }
  }

  /**
   * Validar un código de descuento
   */
  static async validateCode(codigo, montoCompra = 0) {
    try {
      const query = `
        SELECT 
          id_codigo,
          codigo,
          descripcion,
          tipo_descuento,
          valor_descuento,
          monto_minimo,
          usos_maximos,
          usos_actuales,
          activo,
          fecha_inicio,
          fecha_fin
        FROM codigos_descuento 
        WHERE UPPER(codigo) = UPPER($1)
          AND activo = true
          AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_TIMESTAMP)
          AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_TIMESTAMP)
          AND (usos_maximos IS NULL OR usos_actuales < usos_maximos)
          AND (monto_minimo <= $2)
      `;
      
      const result = await pool.query(query, [codigo, montoCompra]);
      
      if (result.rows.length === 0) {
        return {
          valid: false,
          message: 'Código no válido, expirado o no cumple requisitos mínimos'
        };
      }

      const discountCode = result.rows[0];
      
      // Calcular el descuento
      let descuentoCalculado = 0;
      if (discountCode.tipo_descuento === 'porcentaje') {
        descuentoCalculado = (montoCompra * discountCode.valor_descuento) / 100;
      } else if (discountCode.tipo_descuento === 'monto_fijo') {
        descuentoCalculado = discountCode.valor_descuento;
      }

      return {
        valid: true,
        codigo: discountCode,
        descuento: descuentoCalculado,
        message: 'Código válido aplicado'
      };
      
    } catch (error) {
      console.error('❌ Error validando código:', error);
      throw error;
    }
  }

  /**
   * Usar un código de descuento (incrementar contador)
   */
  static async useCode(codigo) {
    try {
      const query = `
        UPDATE codigos_descuento 
        SET usos_actuales = usos_actuales + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE UPPER(codigo) = UPPER($1)
        RETURNING *
      `;
      
      const result = await pool.query(query, [codigo]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error usando código:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo código de descuento
   */
  static async create(codeData) {
    try {
      const {
        codigo,
        descripcion,
        tipo_descuento,
        valor_descuento,
        monto_minimo = 0,
        usos_maximos = null,
        activo = true,
        fecha_inicio = null,
        fecha_fin = null
      } = codeData;

      const query = `
        INSERT INTO codigos_descuento (
          codigo, descripcion, tipo_descuento, valor_descuento,
          monto_minimo, usos_maximos, activo, fecha_inicio, fecha_fin
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        codigo, descripcion, tipo_descuento, valor_descuento,
        monto_minimo, usos_maximos, activo, fecha_inicio, fecha_fin
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creando código de descuento:', error);
      throw error;
    }
  }

  /**
   * Actualizar código de descuento
   */
  static async update(id, codeData) {
    try {
      const {
        codigo,
        descripcion,
        tipo_descuento,
        valor_descuento,
        monto_minimo,
        usos_maximos,
        activo,
        fecha_inicio,
        fecha_fin
      } = codeData;

      const query = `
        UPDATE codigos_descuento 
        SET codigo = $2,
            descripcion = $3,
            tipo_descuento = $4,
            valor_descuento = $5,
            monto_minimo = $6,
            usos_maximos = $7,
            activo = $8,
            fecha_inicio = $9,
            fecha_fin = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id_codigo = $1
        RETURNING *
      `;
      
      const values = [
        id, codigo, descripcion, tipo_descuento, valor_descuento,
        monto_minimo, usos_maximos, activo, fecha_inicio, fecha_fin
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error actualizando código:', error);
      throw error;
    }
  }

  /**
   * Eliminar código de descuento
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM codigos_descuento WHERE id_codigo = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error eliminando código:', error);
      throw error;
    }
  }

  /**
   * Obtener código por ID
   */
  static async getById(id) {
    try {
      const query = 'SELECT * FROM codigos_descuento WHERE id_codigo = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error obteniendo código por ID:', error);
      throw error;
    }
  }
}

module.exports = DiscountCodeModel;
