// notes.routes.js - Rutas para gestión de notas generales

const express = require('express');
const NotesController = require('../controllers/notes.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// ===== RUTAS DE NOTAS =====

// GET /api/notes - Obtener todas las notas con filtros y búsqueda
router.get('/', verifyToken, NotesController.getAllNotes);

// GET /api/notes/stats - Obtener estadísticas de notas
router.get('/stats', verifyToken, NotesController.getNotesStats);

// GET /api/notes/tags - Obtener todas las etiquetas únicas
router.get('/tags', verifyToken, NotesController.getAllTags);

// GET /api/notes/:id - Obtener nota específica por ID
router.get('/:id', verifyToken, NotesController.getNoteById);

// POST /api/notes - Crear nueva nota
router.post('/', verifyToken, requireAdmin, NotesController.createNote);

// PUT /api/notes/:id - Actualizar nota existente
router.put('/:id', verifyToken, requireAdmin, NotesController.updateNote);

// DELETE /api/notes/:id - Eliminar nota (soft delete)
router.delete('/:id', verifyToken, requireAdmin, NotesController.deleteNote);

module.exports = router;
