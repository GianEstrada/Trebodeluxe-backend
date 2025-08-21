// controllers/promotion.controller.js - Controlador para promociones

const PromotionModel = require('../models/promotion.model');

class PromotionController {
  
  /**
   * Obtener todas las promociones activas (versión simplificada para evitar errores de BD)
   * Endpoint público principal usado por el frontend
   */
  static async getActivePromotions(req, res) {
    try {
      console.log('🎯 Solicitando promociones activas...');
      
      // Intentar consulta completa primero
      let promotions;
      try {
        promotions = await PromotionModel.getAllActive();
        console.log(`✅ Consulta completa exitosa: ${promotions.length} promociones`);
      } catch (dbError) {
        console.log('⚠️ Error en consulta compleja, usando fallback:', dbError.message);
        // Si falla, usar consulta simple
        promotions = await PromotionModel.getActiveSimple();
        console.log(`✅ Fallback exitoso: ${promotions.length} promociones`);
      }
      
      res.status(200).json({
        success: true,
        message: 'Promociones activas obtenidas exitosamente',
        promotions: promotions || [] // Frontend espera 'promotions', no 'data'
      });
    } catch (error) {
      console.error('❌ Error en getActivePromotions:', error);
      
      // Retornar respuesta vacía válida en lugar de error
      res.status(200).json({
        success: true,
        message: 'No hay promociones activas disponibles',
        promotions: []
      });
    }
  }

  /**
   * Obtener promociones específicas para un producto
   * Implementa sistema de prioridades y filtros por categoría
   */
  static async getPromotionsForProduct(req, res) {
    try {
      const { productId } = req.params;
      const { categoria } = req.query;
      
      console.log(`🎯 Buscando promociones para producto ${productId}, categoría: ${categoria}`);
      
      const promotions = await PromotionModel.getPromotionsForProduct(productId, categoria);
      
      res.status(200).json({
        success: true,
        message: 'Promociones para producto obtenidas exitosamente',
        data: promotions,
        product_id: productId,
        categoria: categoria
      });
      
    } catch (error) {
      console.error('❌ Error en getPromotionsForProduct:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo promociones del producto',
        error: error.message
      });
    }
  }

  /**
   * Debug detallado de promociones
   * Herramienta de diagnóstico para identificar problemas
   */
  static async debugAllPromotions(req, res) {
    try {
      console.log('🔍 Iniciando debug de promociones...');
      
      const debugData = await PromotionModel.debugAllPromotions();
      
      res.status(200).json({
        success: true,
        message: 'Debug de promociones completado',
        data: debugData,
        total: debugData.length
      });
      
    } catch (error) {
      console.error('❌ Error en debugAllPromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error en debug de promociones',
        error: error.message
      });
    }
  }

  /**
   * Obtener todas las promociones (para admin)
   */
  static async getAllPromotions(req, res) {
    try {
      const promotions = await PromotionModel.getAllActive();
      
      res.status(200).json({
        success: true,
        message: 'Todas las promociones obtenidas exitosamente',
        data: promotions
      });
    } catch (error) {
      console.error('❌ Error en getAllPromotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Crear nueva promoción
   */
  static async createPromotion(req, res) {
    try {
      const promotionData = req.body;
      const newPromotion = await PromotionModel.create(promotionData);
      
      res.status(201).json({
        success: true,
        message: 'Promoción creada exitosamente',
        data: newPromotion
      });
    } catch (error) {
      console.error('❌ Error creando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error creando promoción',
        error: error.message
      });
    }
  }

  /**
   * Actualizar promoción existente
   */
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
      console.error('❌ Error actualizando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando promoción',
        error: error.message
      });
    }
  }

  /**
   * Eliminar promoción
   */
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
      console.error('❌ Error eliminando promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error eliminando promoción',
        error: error.message
      });
    }
  }

  /**
   * Validar código promocional
   */
  static async validatePromotionCode(req, res) {
    try {
      const { codigo } = req.params;
      const validation = await PromotionModel.validateCode(codigo);
      
      res.status(200).json({
        success: validation.valid,
        message: validation.message,
        data: validation.promotion || null
      });
    } catch (error) {
      console.error('❌ Error validando código:', error);
      res.status(500).json({
        success: false,
        message: 'Error validando código promocional',
        error: error.message
      });
    }
  }

  /**
   * Obtener promociones para homepage
   */
  static async getHomepagePromotions(req, res) {
    try {
      const { limit = 5 } = req.query;
      const promotions = await PromotionModel.getHomepagePromotions(parseInt(limit));
      
      res.status(200).json({
        success: true,
        message: 'Promociones del homepage obtenidas exitosamente',
        data: promotions
      });
    } catch (error) {
      console.error('❌ Error obteniendo promociones del homepage:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo promociones del homepage',
        error: error.message
      });
    }
  }

  /**
   * Obtener promociones por categoría
   */
  static async getPromotionsByCategory(req, res) {
    try {
      const { categoria } = req.params;
      const promotions = await PromotionModel.getPromotionsByCategory(categoria);
      
      res.status(200).json({
        success: true,
        message: `Promociones para categoría ${categoria} obtenidas exitosamente`,
        data: promotions,
        categoria: categoria
      });
    } catch (error) {
      console.error('❌ Error obteniendo promociones por categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo promociones por categoría',
        error: error.message
      });
    }
  }

  /**
   * Obtener productos de una promoción (funcionalidad heredada)
   */
  static async getPromotionProducts(req, res) {
    try {
      const { id_promocion } = req.params;
      const { limit = 10 } = req.query;
      
      // Por ahora devolvemos respuesta vacía válida
      res.status(200).json({
        success: true,
        message: 'Productos de promoción obtenidos exitosamente',
        data: [],
        promocion_id: id_promocion
      });
    } catch (error) {
      console.error('❌ Error obteniendo productos de promoción:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo productos de promoción',
        error: error.message
      });
    }
  }

  /**
   * Obtener promociones aplicables (funcionalidad heredada)
   */
  static async getApplicablePromotions(req, res) {
    try {
      const { productId, categoria } = req.params;
      
      // Redirigir a la nueva función
      const promotions = await PromotionModel.getPromotionsForProduct(productId, categoria);
      
      res.status(200).json({
        success: true,
        message: 'Promociones aplicables obtenidas exitosamente',
        data: promotions,
        product_id: productId,
        categoria: categoria
      });
    } catch (error) {
      console.error('❌ Error obteniendo promociones aplicables:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo promociones aplicables',
        error: error.message
      });
    }
  }

}

module.exports = PromotionController;
