const { validationResult } = require('express-validator');
const db = require('../config/db');

// @desc    Obtener información de envío del usuario
// @route   GET /api/shipping
// @access  Private
const getShippingInfo = async (req, res) => {
  const userId = req.user.id_usuario;

  try {
    console.log('📦 [SHIPPING] Obteniendo información de envío para usuario:', userId);
    
    const result = await db.query(
      'SELECT * FROM informacion_envio WHERE id_usuario = $1 ORDER BY ultima_actualizacion DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length > 0) {
      const shippingInfo = result.rows[0];
      console.log('✅ [SHIPPING] Información encontrada para usuario:', userId);
      
      res.json({
        success: true,
        shippingInfo: shippingInfo,
        message: 'Información de envío obtenida exitosamente'
      });
    } else {
      console.log('ℹ️ [SHIPPING] No se encontró información de envío para usuario:', userId);
      
      res.json({
        success: false,
        shippingInfo: null,
        message: 'No se encontró información de envío para este usuario'
      });
    }
  } catch (error) {
    console.error('❌ [SHIPPING] Error al obtener información de envío:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener información de envío',
      error: error.message 
    });
  }
};

// @desc    Crear o actualizar información de envío del usuario
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
    pais,
    referencias
  } = req.body;

  try {
    console.log('📦 [SHIPPING] Creando/actualizando información de envío para usuario:', userId);
    console.log('📦 [SHIPPING] Datos recibidos:', req.body);

    // Verificar si ya existe información de envío para este usuario
    const existingResult = await db.query(
      'SELECT id_informacion FROM informacion_envio WHERE id_usuario = $1',
      [userId]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Actualizar información existente
      const id_informacion = existingResult.rows[0].id_informacion;
      console.log('🔄 [SHIPPING] Actualizando información existente, ID envío:', id_informacion);
      
      result = await db.query(
        `UPDATE informacion_envio 
         SET nombre_completo = $1, telefono = $2, direccion = $3, ciudad = $4, 
             estado = $5, codigo_postal = $6, pais = $7, referencias = $8, 
             ultima_actualizacion = NOW()
         WHERE id_informacion = $9
         RETURNING *`,
        [nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais, referencias, id_informacion]
      );
    } else {
      // Crear nueva información de envío
      console.log('➕ [SHIPPING] Creando nueva información de envío');
      
      result = await db.query(
        `INSERT INTO informacion_envio 
         (id_usuario, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais, referencias)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [userId, nombre_completo, telefono, direccion, ciudad, estado, codigo_postal, pais, referencias]
      );
    }

    console.log('✅ [SHIPPING] Información de envío guardada exitosamente');
    
    res.json({
      success: true,
      shippingInfo: result.rows[0],
      message: existingResult.rows.length > 0 ? 'Información de envío actualizada' : 'Información de envío creada'
    });
  } catch (error) {
    console.error('❌ [SHIPPING] Error al guardar información de envío:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al guardar información de envío',
      error: error.message 
    });
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
