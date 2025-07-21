// controllers/promotion.controller.js - Controlador para promociones

const PromotionModel = require('../models/promotion.model');

class PromotionController {
  // Obtener todas las promociones activas
  static async getActivePromotions(req, res) {
    try {
      const promotions = await PromotionModel.getAllActive();
      
      res.status(200).json({
        success: true,
        message: 'Promociones activas obtenidas exitosamente',
        data: promotions
      });
    } catch (error) {
      console.error('Error en getActivePromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todas las promociones (para admin)
  static async getAllPromotions(req, res) {
    try {
      const promotions = await PromotionModel.getAll();
      
      res.status(200).json({
        success: true,
        message: 'Todas las promociones obtenidas exitosamente',
        data: promotions
      });
    } catch (error) {
      console.error('Error en getAllPromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear una nueva promoción
  static async createPromotion(req, res) {
    try {
      const {
        nombre,
        tipo,
        fecha_inicio,
        fecha_fin,
        uso_maximo,
        activo,
        // Detalles específicos por tipo
        cantidad_comprada,
        cantidad_pagada,
        porcentaje,
        codigo,
        descuento,
        tipo_descuento,
        // Aplicaciones
        aplicaciones
      } = req.body;

      // Validaciones básicas
      if (!nombre || !tipo || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: nombre, tipo, fecha_inicio, fecha_fin'
        });
      }

      // Validar tipo de promoción
      if (!['x_por_y', 'porcentaje', 'codigo'].includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de promoción inválido. Debe ser: x_por_y, porcentaje, o codigo'
        });
      }

      // Validaciones específicas por tipo
      const promotionData = {
        nombre,
        tipo,
        fecha_inicio,
        fecha_fin,
        uso_maximo,
        activo,
        aplicaciones
      };

      switch (tipo) {
        case 'x_por_y':
          if (!cantidad_comprada || !cantidad_pagada) {
            return res.status(400).json({
              success: false,
              message: 'Para promociones x_por_y se requiere cantidad_comprada y cantidad_pagada'
            });
          }
          promotionData.cantidad_comprada = cantidad_comprada;
          promotionData.cantidad_pagada = cantidad_pagada;
          break;

        case 'porcentaje':
          if (!porcentaje || porcentaje <= 0 || porcentaje > 100) {
            return res.status(400).json({
              success: false,
              message: 'Para promociones por porcentaje se requiere un porcentaje válido (1-100)'
            });
          }
          promotionData.porcentaje = porcentaje;
          break;

        case 'codigo':
          if (!codigo || !descuento || !tipo_descuento) {
            return res.status(400).json({
              success: false,
              message: 'Para promociones con código se requiere codigo, descuento y tipo_descuento'
            });
          }
          if (!['porcentaje', 'monto'].includes(tipo_descuento)) {
            return res.status(400).json({
              success: false,
              message: 'tipo_descuento debe ser "porcentaje" o "monto"'
            });
          }
          promotionData.codigo = codigo.toUpperCase();
          promotionData.descuento = descuento;
          promotionData.tipo_descuento = tipo_descuento;
          break;
      }

      const newPromotion = await PromotionModel.create(promotionData);

      res.status(201).json({
        success: true,
        message: 'Promoción creada exitosamente',
        data: newPromotion
      });
    } catch (error) {
      console.error('Error en createPromotion:', error);
      
      if (error.message.includes('duplicate key value violates unique constraint')) {
        return res.status(400).json({
          success: false,
          message: 'El código de promoción ya existe'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar una promoción
  static async updatePromotion(req, res) {
    try {
      const { id } = req.params;
      const promotionData = req.body;

      const updatedPromotion = await PromotionModel.update(id, promotionData);

      res.status(200).json({
        success: true,
        message: 'Promoción actualizada exitosamente',
        data: updatedPromotion
      });
    } catch (error) {
      console.error('Error en updatePromotion:', error);
      
      if (error.message === 'Promoción no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Promoción no encontrada'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar una promoción
  static async deletePromotion(req, res) {
    try {
      const { id } = req.params;

      const deletedPromotion = await PromotionModel.delete(id);

      res.status(200).json({
        success: true,
        message: 'Promoción eliminada exitosamente',
        data: deletedPromotion
      });
    } catch (error) {
      console.error('Error en deletePromotion:', error);
      
      if (error.message === 'Promoción no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Promoción no encontrada'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Validar código de promoción
  static async validatePromotionCode(req, res) {
    try {
      const { codigo } = req.params;

      if (!codigo) {
        return res.status(400).json({
          success: false,
          message: 'Código de promoción requerido'
        });
      }

      const promotion = await PromotionModel.validateCode(codigo);

      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: 'Código de promoción inválido o expirado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Código de promoción válido',
        data: promotion
      });
    } catch (error) {
      console.error('Error en validatePromotionCode:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener promociones aplicables a un producto
  static async getApplicablePromotions(req, res) {
    try {
      const { productId, categoria } = req.params;

      const promotions = await PromotionModel.getApplicableToProduct(productId, categoria);

      res.status(200).json({
        success: true,
        message: 'Promociones aplicables obtenidas exitosamente',
        data: promotions
      });
    } catch (error) {
      console.error('Error en getApplicablePromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = PromotionController;
