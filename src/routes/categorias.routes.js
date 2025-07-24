const express = require('express');
const router = express.Router();
const {
  getCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getProductosByCategoria
} = require('../controllers/categorias.controller');

// Rutas para categorías
router.get('/', getCategorias);                    // GET /api/admin/categorias
router.get('/:id', getCategoriaById);              // GET /api/admin/categorias/:id
router.post('/', createCategoria);                 // POST /api/admin/categorias
router.put('/:id', updateCategoria);               // PUT /api/admin/categorias/:id
router.delete('/:id', deleteCategoria);            // DELETE /api/admin/categorias/:id
router.get('/:id/productos', getProductosByCategoria); // GET /api/admin/categorias/:id/productos

module.exports = router;
