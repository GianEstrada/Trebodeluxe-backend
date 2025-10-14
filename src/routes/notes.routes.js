// notes.routes.js - Rutas para gestión de notas generales

const express = require('express');
const NotesController = require('../controllers/notes.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// ===== RUTAS DE NOTAS =====

// GET /api/notes - Obtener todas las notas con filtros y búsqueda
router.get('/', NotesController.getAllNotes);

// GET /api/notes/stats - Obtener estadísticas de notas
router.get('/stats', NotesController.getNotesStats);

// GET /api/notes/tags - Obtener todas las etiquetas únicas
router.get('/tags', NotesController.getAllTags);

// GET /api/notes/:id - Obtener nota específica por ID
router.get('/:id', NotesController.getNoteById);

// POST /api/notes - Crear nueva nota (autenticación opcional)
router.post('/', NotesController.createNote);

// PUT /api/notes/:id - Actualizar nota existente
router.put('/:id', NotesController.updateNote);

// DELETE /api/notes/:id - Eliminar nota (soft delete)
router.delete('/:id', NotesController.deleteNote);

module.exports = router;
