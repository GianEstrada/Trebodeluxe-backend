const Promotion = require('../models/promotion.model');

class PromocionesController {
  // Obtener promociones para un producto específico
  async getPromotionsForProduct(req, res) {
    try {
      const { productId } = req.params;
      
      if (!productId || isNaN(productId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de producto inválido'
        });
      }

      console.log('🎯 Buscando promociones para producto:', productId);
      
      const promotions = await Promotion.getPromotionsForProduct(parseInt(productId));
      
      console.log('📦 Promociones encontradas:', promotions);
      
      return res.status(200).json({
        success: true,
        promotions: promotions || [],
        count: promotions ? promotions.length : 0
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo promociones para producto:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todas las promociones activas
  async getActivePromotions(req, res) {
    try {
      console.log('🎯 Buscando todas las promociones activas');
      
      const promotions = await Promotion.getActivePromotions();
      
      console.log('📦 Promociones activas encontradas:', promotions?.length || 0);
      
      return res.status(200).json({
        success: true,
        promotions: promotions || [],
        count: promotions ? promotions.length : 0
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo promociones activas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener promociones por categoría
  async getPromotionsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      
      if (!categoryId || isNaN(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de categoría inválido'
        });
      }

      console.log('🎯 Buscando promociones para categoría:', categoryId);
      
      const promotions = await Promotion.getPromotionsByCategory(parseInt(categoryId));
      
      console.log('📦 Promociones de categoría encontradas:', promotions);
      
      return res.status(200).json({
        success: true,
        promotions: promotions || [],
        count: promotions ? promotions.length : 0
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo promociones por categoría:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new PromocionesController();
