// controllers/size.controller.js - Controlador para sistemas de tallas y tallas

const SizeModel = require('../models/size.model');

class SizeController {
  // Obtener todos los sistemas de tallas con sus tallas
  static async getAllSystems(req, res) {
    try {
      const systems = await SizeModel.getAllSystems();
      
      res.status(200).json({
        success: true,
        message: 'Sistemas de tallas obtenidos exitosamente',
        data: systems
      });
    } catch (error) {
      console.error('Error en getAllSystems:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener un sistema de tallas específico
  static async getSystemById(req, res) {
    try {
      const { id } = req.params;
      const system = await SizeModel.getSystemById(id);
      
      if (!system) {
        return res.status(404).json({
          success: false,
          message: 'Sistema de tallas no encontrado'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Sistema de tallas obtenido exitosamente',
        data: system
      });
    } catch (error) {
      console.error('Error en getSystemById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear un nuevo sistema de tallas
  static async createSystem(req, res) {
    try {
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del sistema de tallas es requerido'
        });
      }

      const newSystem = await SizeModel.createSystem(nombre);

      res.status(201).json({
        success: true,
        message: 'Sistema de tallas creado exitosamente',
        data: newSystem
      });
    } catch (error) {
      console.error('Error en createSystem:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar un sistema de tallas
  static async updateSystem(req, res) {
    try {
      const { id } = req.params;
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del sistema de tallas es requerido'
        });
      }

      const updatedSystem = await SizeModel.updateSystem(id, nombre);

      res.status(200).json({
        success: true,
        message: 'Sistema de tallas actualizado exitosamente',
        data: updatedSystem
      });
    } catch (error) {
      console.error('Error en updateSystem:', error);
      
      if (error.message === 'Sistema de tallas no encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Sistema de tallas no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar un sistema de tallas
  static async deleteSystem(req, res) {
    try {
      const { id } = req.params;

      const deletedSystem = await SizeModel.deleteSystem(id);

      res.status(200).json({
        success: true,
        message: 'Sistema de tallas eliminado exitosamente',
        data: deletedSystem
      });
    } catch (error) {
      console.error('Error en deleteSystem:', error);
      
      if (error.message === 'Sistema de tallas no encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Sistema de tallas no encontrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear una nueva talla
  static async createSize(req, res) {
    try {
      const { id_sistema_talla, nombre_talla, orden } = req.body;

      if (!id_sistema_talla || !nombre_talla || orden === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Los campos id_sistema_talla, nombre_talla y orden son requeridos'
        });
      }

      const newSize = await SizeModel.createSize(id_sistema_talla, nombre_talla, orden);

      res.status(201).json({
        success: true,
        message: 'Talla creada exitosamente',
        data: newSize
      });
    } catch (error) {
      console.error('Error en createSize:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar una talla
  static async updateSize(req, res) {
    try {
      const { id } = req.params;
      const { nombre_talla, orden } = req.body;

      if (!nombre_talla || orden === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Los campos nombre_talla y orden son requeridos'
        });
      }

      const updatedSize = await SizeModel.updateSize(id, nombre_talla, orden);

      res.status(200).json({
        success: true,
        message: 'Talla actualizada exitosamente',
        data: updatedSize
      });
    } catch (error) {
      console.error('Error en updateSize:', error);
      
      if (error.message === 'Talla no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Talla no encontrada'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Eliminar una talla
  static async deleteSize(req, res) {
    try {
      const { id } = req.params;

      const deletedSize = await SizeModel.deleteSize(id);

      res.status(200).json({
        success: true,
        message: 'Talla eliminada exitosamente',
        data: deletedSize
      });
    } catch (error) {
      console.error('Error en deleteSize:', error);
      
      if (error.message === 'Talla no encontrada') {
        return res.status(404).json({
          success: false,
          message: 'Talla no encontrada'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener tallas por sistema
  static async getSizesBySystem(req, res) {
    try {
      const { systemId } = req.params;
      const sizes = await SizeModel.getSizesBySystem(systemId);

      res.status(200).json({
        success: true,
        message: 'Tallas obtenidas exitosamente',
        data: sizes
      });
    } catch (error) {
      console.error('Error en getSizesBySystem:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener stock por producto y variante
  static async getStockByProductVariant(req, res) {
    try {
      const { productId, variantId } = req.params;
      const stock = await SizeModel.getStockByProductVariant(productId, variantId);

      res.status(200).json({
        success: true,
        message: 'Stock obtenido exitosamente',
        data: stock
      });
    } catch (error) {
      console.error('Error en getStockByProductVariant:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar stock
  static async updateStock(req, res) {
    try {
      const { id_producto, id_variante, id_talla, cantidad } = req.body;

      if (!id_producto || !id_variante || !id_talla || cantidad === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Los campos id_producto, id_variante, id_talla y cantidad son requeridos'
        });
      }

      if (cantidad < 0) {
        return res.status(400).json({
          success: false,
          message: 'La cantidad no puede ser negativa'
        });
      }

      const updatedStock = await SizeModel.updateStock(id_producto, id_variante, id_talla, cantidad);

      res.status(200).json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: updatedStock
      });
    } catch (error) {
      console.error('Error en updateStock:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todo el stock con información detallada
  static async getAllStock(req, res) {
    try {
      const stock = await SizeModel.getAllStock();

      res.status(200).json({
        success: true,
        message: 'Stock completo obtenido exitosamente',
        data: stock
      });
    } catch (error) {
      console.error('Error en getAllStock:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = SizeController;
