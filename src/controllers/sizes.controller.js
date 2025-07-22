const SizesModel = require('../models/sizes.model');

const SizesController = {
  async getAllSystems(req, res) {
    console.log('SizesController.getAllSystems llamado');
    try {
      const systems = await SizesModel.getAllSystems();
      res.json({ success: true, sizeSystems: systems });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener sistemas de tallas', error: error.message });
    }
  },

  async searchSystems(req, res) {
    console.log('SizesController.searchSystems llamado');
    try {
      const { search } = req.query;
      const systems = await SizesModel.searchSystems(search);
      res.json({ success: true, sizeSystems: systems });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al buscar sistemas de tallas', error: error.message });
    }
  },

  async updateSystem(req, res) {
    console.log('SizesController.updateSystem llamado');
    try {
      const { id } = req.params;
      const system = await SizesModel.updateSystem(id, req.body);
      res.json({ success: true, system });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar sistema de tallas', error: error.message });
    }
  },

  async deleteSystem(req, res) {
    console.log('SizesController.deleteSystem llamado');
    try {
      const { id } = req.params;
      const deletedSystem = await SizesModel.deleteSystem(id);
      if (deletedSystem) {
        res.json({ success: true, message: 'Sistema eliminado correctamente', system: deletedSystem });
      } else {
        res.status(404).json({ success: false, message: 'Sistema no encontrado' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al eliminar sistema', error: error.message });
    }
  },
  async getAllSizes(req, res) {
    console.log('SizesController.getAllSizes llamado');
    try {
      const sizes = await SizesModel.getAllSizes();
      res.json({ success: true, sizes });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener tallas', error: error.message });
    }
  },
  async createSystem(req, res) {
    try {
      const system = await SizesModel.createSystem(req.body);
      res.json({ success: true, system });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al crear sistema de tallas', error: error.message });
    }
  },
  async createSize(req, res) {
    try {
      const size = await SizesModel.createSize(req.body);
      res.json({ success: true, size });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al crear talla', error: error.message });
    }
  },
  async deleteSize(req, res) {
    try {
      const { id } = req.params;
      const deletedSize = await SizesModel.deleteSize(id);
      if (deletedSize) {
        res.json({ success: true, message: 'Talla eliminada correctamente', size: deletedSize });
      } else {
        res.status(404).json({ success: false, message: 'Talla no encontrada' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al eliminar talla', error: error.message });
    }
  }
};

module.exports = SizesController;
