const SizesModel = require('../models/sizes.model');

const SizesController = {
  async getAllSystems(req, res) {
    console.log('SizesController.getAllSystems llamado');
    try {
      const systems = await SizesModel.getAllSystems();
      res.json({ success: true, size_systems: systems });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener sistemas de tallas', error: error.message });
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
