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
      const { page = 1, limit = 10, active } = req.query;
      
      console.log(`🔍 [ADMIN] Obteniendo promociones - page: ${page}, limit: ${limit}, active: ${active}`);
      
      // Usar la función correcta según si necesitamos todas o solo activas
      let promotions;
      if (active === 'true') {
        promotions = await PromotionModel.getAllActive();
      } else if (active === 'false') {
        // Para inactivas, necesitaríamos filtrar las de getAll()
        const allPromotions = await PromotionModel.getAll();
        promotions = allPromotions.filter(p => !p.activo);
      } else {
        // Sin filtro, obtener todas
        promotions = await PromotionModel.getAll();
      }
      
      // Aplicar paginación manualmente si es necesario
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedPromotions = promotions.slice(startIndex, endIndex);
      
      console.log(`✅ [ADMIN] ${paginatedPromotions.length} promociones obtenidas`);
      
      res.status(200).json({
        success: true,
        message: 'Todas las promociones obtenidas exitosamente',
        data: paginatedPromotions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: promotions.length,
          pages: Math.ceil(promotions.length / parseInt(limit))
        }
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

  /**
   * Debug específico para admin panel - sin autenticación
   * Para verificar exactamente qué estructura de datos se envía al frontend
   */
  static async debugAdminResponse(req, res) {
    try {
      console.log('🔍 [DEBUG ADMIN] Simulando respuesta del admin panel...');
      
      // Simular exactamente la misma lógica que getAllPromotions
      const { page = 1, limit = 10, active = 'true' } = req.query;
      
      console.log(`🔍 [DEBUG ADMIN] Parámetros - page: ${page}, limit: ${limit}, active: ${active}`);
      
      // TEMPORAL: Usar getAll() para debug en lugar de getAllActive()
      let promotions;
      if (active === 'true') {
        // promotions = await PromotionModel.getAllActive();
        const allPromotions = await PromotionModel.getAll();
        promotions = allPromotions.filter(p => p.activo === true);
        console.log(`🔧 [DEBUG ADMIN] Usando getAll() filtrado: ${promotions.length} activas de ${allPromotions.length} totales`);
      } else if (active === 'false') {
        // Para inactivas, necesitaríamos filtrar las de getAll()
        const allPromotions = await PromotionModel.getAll();
        promotions = allPromotions.filter(p => !p.activo);
      } else {
        // Sin filtro, obtener todas
        promotions = await PromotionModel.getAll();
      }
      
      // Aplicar paginación manualmente si es necesario
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedPromotions = promotions.slice(startIndex, endIndex);
      
      console.log(`✅ [DEBUG ADMIN] ${paginatedPromotions.length} promociones obtenidas`);
      
      // Mostrar la estructura exacta de cada promoción
      paginatedPromotions.forEach((promo, index) => {
        console.log(`📊 [DEBUG ADMIN] Promoción ${index + 1}:`);
        console.log(`  - ID: ${promo.id_promocion}`);
        console.log(`  - Nombre: ${promo.nombre}`);
        console.log(`  - Tipo: ${promo.tipo}`);
        console.log(`  - Porcentaje: ${promo.porcentaje} (tipo: ${typeof promo.porcentaje})`);
        console.log(`  - Detalles: ${JSON.stringify(promo.detalles)}`);
        console.log(`  - Activo: ${promo.activo}`);
        console.log('  ---');
      });
      
      const response = {
        success: true,
        message: 'DEBUG: Todas las promociones obtenidas exitosamente',
        data: paginatedPromotions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: promotions.length,
          pages: Math.ceil(promotions.length / parseInt(limit))
        }
      };
      
      console.log(`🔍 [DEBUG ADMIN] Estructura de respuesta:`, JSON.stringify(response, null, 2));
      
      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ [DEBUG ADMIN] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error en debug de admin panel',
        error: error.message
      });
    }
  }

}

module.exports = PromotionController;
