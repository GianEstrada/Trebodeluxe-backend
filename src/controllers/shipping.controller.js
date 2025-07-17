const { validationResult } = require('express-validator');
const db = require('../config/db');

// @desc    Obtener información de envío del usuario
// @route   GET /api/shipping
// @access  Private
const getShippingInfo = async (req, res) => {
  const userId = req.user.id_usuario;

  try {
    const result = await db.query(
      'SELECT * FROM informacion_envio WHERE id_usuario = $1',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener información de envío:', error);
    res.status(500).json({ message: 'Error al obtener información de envío' });
  }
};

// @desc    Crear información de envío
// @route   POST /api/shipping
// @access  Private
const createShippingInfo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.id_usuario;
  const {
    nombre_completo,
    telefono,
    direccion,
    ciudad,
    estado,
    codigo_postal,
    pais
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO informacion_envio 
       (id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [userId, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear información de envío:', error);
    res.status(500).json({ message: 'Error al crear información de envío' });
  }
};

// @desc    Actualizar información de envío
// @route   PUT /api/shipping/:id
// @access  Private
const updateShippingInfo = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const shippingId = req.params.id;
  const userId = req.user.id_usuario;
  const {
    nombre_completo,
    telefono,
    direccion,
    ciudad,
    estado,
    codigo_postal,
    pais
  } = req.body;

  try {
    // Verificar que la dirección pertenece al usuario
    const verify = await db.query(
      'SELECT * FROM informacion_envio WHERE id_informacion = $1 AND id_usuario = $2',
      [shippingId, userId]
    );

    if (verify.rows.length === 0) {
      return res.status(404).json({ message: 'Información de envío no encontrada' });
    }

    const result = await db.query(
      `UPDATE informacion_envio 
       SET nombre_completo = $1, telefono = $2, direccion = $3, ciudad = $4, 
           estado = $5, codigo_postal = $6, pais = $7, ultima_actualizacion = CURRENT_TIMESTAMP 
       WHERE id_informacion = $8 AND id_usuario = $9 
       RETURNING *`,
      [nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais, shippingId, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar información de envío:', error);
    res.status(500).json({ message: 'Error al actualizar información de envío' });
  }
};

// @desc    Eliminar información de envío
// @route   DELETE /api/shipping/:id
// @access  Private
const deleteShippingInfo = async (req, res) => {
  const shippingId = req.params.id;
  const userId = req.user.id_usuario;

  try {
    // Verificar que la dirección pertenece al usuario
    const verify = await db.query(
      'SELECT * FROM informacion_envio WHERE id_informacion = $1 AND id_usuario = $2',
      [shippingId, userId]
    );

    if (verify.rows.length === 0) {
      return res.status(404).json({ message: 'Información de envío no encontrada' });
    }

    await db.query(
      'DELETE FROM informacion_envio WHERE id_informacion = $1 AND id_usuario = $2',
      [shippingId, userId]
    );

    res.json({ message: 'Información de envío eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar información de envío:', error);
    res.status(500).json({ message: 'Error al eliminar información de envío' });
  }
};

module.exports = {
  getShippingInfo,
  createShippingInfo,
  updateShippingInfo,
  deleteShippingInfo
};
