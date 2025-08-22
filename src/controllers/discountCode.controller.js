const DiscountCodeModel = require('../models/discountCode.model');

class DiscountCodeController {

  /**
   * Crear la tabla de códigos de descuento
   */
  static async createTable(req, res) {
    try {
      await DiscountCodeModel.createTable();
      res.status(200).json({
        success: true,
        message: 'Tabla de códigos de descuento creada exitosamente'
      });
    } catch (error) {
      console.error('❌ Error creando tabla:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando tabla de códigos de descuento',
        error: error.message
      });
    }
  }

  /**
   * Obtener todos los códigos de descuento (Admin)
   */
  static async getAllCodes(req, res) {
    try {
      const codes = await DiscountCodeModel.getAll();
      
      res.status(200).json({
        success: true,
        message: 'Códigos de descuento obtenidos exitosamente',
        data: codes,
        total: codes.length
      });
    } catch (error) {
      console.error('❌ Error obteniendo códigos:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo códigos de descuento',
        error: error.message
      });
    }
  }

  /**
   * Obtener códigos activos
   */
  static async getActiveCodes(req, res) {
    try {
      const codes = await DiscountCodeModel.getActive();
      
      res.status(200).json({
        success: true,
        message: 'Códigos activos obtenidos exitosamente',
        data: codes,
        total: codes.length
      });
    } catch (error) {
      console.error('❌ Error obteniendo códigos activos:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo códigos activos',
        error: error.message
      });
    }
  }

  /**
   * Validar código de descuento (para checkout)
   */
  static async validateCode(req, res) {
    try {
      const { codigo } = req.params;
      const { monto = 0 } = req.body;
      
      console.log(`🎯 Validando código: ${codigo} para monto: ${monto}`);
      
      const validation = await DiscountCodeModel.validateCode(codigo, monto);
      
      if (validation.valid) {
        res.status(200).json({
          success: true,
          message: validation.message,
          data: {
            codigo: validation.codigo,
            descuento: validation.descuento,
            valid: true
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: validation.message,
          data: {
            valid: false
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error validando código:', error);
      res.status(500).json({
        success: false,
        message: 'Error validando código de descuento',
        error: error.message
      });
    }
  }

  /**
   * Aplicar código de descuento (incrementar uso)
   */
  static async applyCode(req, res) {
    try {
      const { codigo } = req.params;
      const { monto = 0 } = req.body;
      
      console.log(`🎯 Aplicando código: ${codigo} para monto: ${monto}`);
      
      // Primero validar
      const validation = await DiscountCodeModel.validateCode(codigo, monto);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }

      // Si es válido, incrementar uso
      const updatedCode = await DiscountCodeModel.useCode(codigo);
      
      res.status(200).json({
        success: true,
        message: 'Código aplicado exitosamente',
        data: {
          codigo: updatedCode,
          descuento: validation.descuento,
          monto_final: monto - validation.descuento
        }
      });
      
    } catch (error) {
      console.error('❌ Error aplicando código:', error);
      res.status(500).json({
        success: false,
        message: 'Error aplicando código de descuento',
        error: error.message
      });
    }
  }

  /**
   * Crear nuevo código de descuento
   */
  static async createCode(req, res) {
    try {
      const codeData = req.body;
      
      // Validaciones básicas
      if (!codeData.codigo || !codeData.tipo_descuento || !codeData.valor_descuento) {
        return res.status(400).json({
          success: false,
          message: 'Código, tipo de descuento y valor son requeridos'
        });
      }

      const newCode = await DiscountCodeModel.create(codeData);
      
      res.status(201).json({
        success: true,
        message: 'Código de descuento creado exitosamente',
        data: newCode
      });
      
    } catch (error) {
      console.error('❌ Error creando código:', error);
      
      if (error.code === '23505') { // Código duplicado
        res.status(400).json({
          success: false,
          message: 'Ya existe un código con ese nombre'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error creando código de descuento',
          error: error.message
        });
      }
    }
  }

  /**
   * Actualizar código de descuento
   */
  static async updateCode(req, res) {
    try {
      const { id } = req.params;
      const codeData = req.body;
      
      const updatedCode = await DiscountCodeModel.update(id, codeData);
      
      if (!updatedCode) {
        return res.status(404).json({
          success: false,
          message: 'Código de descuento no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Código actualizado exitosamente',
        data: updatedCode
      });
      
    } catch (error) {
      console.error('❌ Error actualizando código:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando código',
        error: error.message
      });
    }
  }

  /**
   * Eliminar código de descuento
   */
  static async deleteCode(req, res) {
    try {
      const { id } = req.params;
      
      const deletedCode = await DiscountCodeModel.delete(id);
      
      if (!deletedCode) {
        return res.status(404).json({
          success: false,
          message: 'Código de descuento no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Código eliminado exitosamente',
        data: deletedCode
      });
      
    } catch (error) {
      console.error('❌ Error eliminando código:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando código',
        error: error.message
      });
    }
  }

  /**
   * Obtener código por ID
   */
  static async getCodeById(req, res) {
    try {
      const { id } = req.params;
      
      const code = await DiscountCodeModel.getById(id);
      
      if (!code) {
        return res.status(404).json({
          success: false,
          message: 'Código de descuento no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Código obtenido exitosamente',
        data: code
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo código:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo código',
        error: error.message
      });
    }
  }

}

module.exports = DiscountCodeController;
