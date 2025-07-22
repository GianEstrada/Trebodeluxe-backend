// controllers/site-settings.controller.js - Controlador para configuraciones del sitio

const db = require('../config/db');

const SiteSettingsController = {
  // Obtener todas las configuraciones
  getAllSettings: async (req, res) => {
    try {
      const query = `
        SELECT 
          id_configuracion,
          clave,
          valor,
          tipo,
          descripcion,
          fecha_actualizacion
        FROM configuraciones_sitio
        ORDER BY clave
      `;
      
      console.log('Obteniendo todas las configuraciones del sitio...');
      const result = await db.pool.query(query);
      
      // Convertir los valores según su tipo
      const settings = result.rows.reduce((acc, row) => {
        let valor = row.valor;
        
        // Parsear valores según su tipo
        if (row.tipo === 'json' && valor) {
          try {
            valor = JSON.parse(valor);
          } catch (e) {
            console.error('Error parsing JSON for key:', row.clave, e);
          }
        } else if (row.tipo === 'number' && valor) {
          valor = Number(valor);
        } else if (row.tipo === 'boolean' && valor) {
          valor = valor.toLowerCase() === 'true';
        }
        
        acc[row.clave] = {
          id: row.id_configuracion,
          value: valor,
          type: row.tipo,
          description: row.descripcion,
          updatedAt: row.fecha_actualizacion
        };
        
        return acc;
      }, {});
      
      console.log('Configuraciones encontradas:', Object.keys(settings).length);
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Error en getAllSettings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las configuraciones del sitio',
        error: error.message
      });
    }
  },

  // Obtener configuraciones específicas del header
  getHeaderSettings: async (req, res) => {
    try {
      const query = `
        SELECT clave, valor, tipo
        FROM configuraciones_sitio
        WHERE clave IN ('header_brand_name', 'header_promo_texts')
        ORDER BY clave
      `;
      
      console.log('Obteniendo configuraciones del header...');
      const result = await db.pool.query(query);
      
      const headerSettings = {
        brandName: 'TREBOLUXE',
        promoTexts: [
          'ENVIO GRATIS EN PEDIDOS ARRIBA DE $500 MXN',
          'OFERTA ESPECIAL: 20% DE DESCUENTO EN SEGUNDA PRENDA'
        ]
      };
      
      // Procesar los resultados
      result.rows.forEach(row => {
        if (row.clave === 'header_brand_name') {
          headerSettings.brandName = row.valor || 'TREBOLUXE';
        } else if (row.clave === 'header_promo_texts') {
          try {
            headerSettings.promoTexts = row.valor ? JSON.parse(row.valor) : headerSettings.promoTexts;
          } catch (e) {
            console.error('Error parsing promo texts JSON:', e);
          }
        }
      });
      
      console.log('Header settings obtenidos:', headerSettings);
      
      res.json({
        success: true,
        headerSettings
      });
    } catch (error) {
      console.error('Error en getHeaderSettings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las configuraciones del header',
        error: error.message
      });
    }
  },

  // Actualizar configuraciones del header
  updateHeaderSettings: async (req, res) => {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { brandName, promoTexts } = req.body;
      
      // Validar datos
      if (!brandName || !Array.isArray(promoTexts)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la marca y los textos promocionales son requeridos'
        });
      }
      
      // Actualizar nombre de la marca
      await client.query(`
        INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion)
        VALUES ('header_brand_name', $1, 'text', 'Nombre de la marca que aparece en el header')
        ON CONFLICT (clave) DO UPDATE SET
          valor = EXCLUDED.valor,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `, [brandName]);
      
      // Actualizar textos promocionales
      await client.query(`
        INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion)
        VALUES ('header_promo_texts', $1, 'json', 'Textos promocionales rotativos del header')
        ON CONFLICT (clave) DO UPDATE SET
          valor = EXCLUDED.valor,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `, [JSON.stringify(promoTexts)]);
      
      await client.query('COMMIT');
      
      console.log('Configuraciones del header actualizadas exitosamente');
      
      res.json({
        success: true,
        message: 'Configuraciones del header actualizadas correctamente',
        data: {
          brandName,
          promoTexts
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en updateHeaderSettings:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar las configuraciones del header',
        error: error.message
      });
    } finally {
      client.release();
    }
  },

  // Actualizar una configuración específica
  updateSetting: async (req, res) => {
    try {
      const { key } = req.params;
      const { value, type = 'text', description } = req.body;
      
      // Validar que el valor sea del tipo correcto
      let processedValue = value;
      if (type === 'json') {
        try {
          if (typeof value === 'object') {
            processedValue = JSON.stringify(value);
          } else {
            JSON.parse(value); // Validar que es JSON válido
            processedValue = value;
          }
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'El valor debe ser un JSON válido'
          });
        }
      }
      
      const query = `
        INSERT INTO configuraciones_sitio (clave, valor, tipo, descripcion)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (clave) DO UPDATE SET
          valor = EXCLUDED.valor,
          tipo = EXCLUDED.tipo,
          descripcion = EXCLUDED.descripcion,
          fecha_actualizacion = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const result = await db.pool.query(query, [key, processedValue, type, description]);
      
      console.log('Configuración actualizada:', key);
      
      res.json({
        success: true,
        message: `Configuración '${key}' actualizada correctamente`,
        setting: result.rows[0]
      });
    } catch (error) {
      console.error('Error en updateSetting:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la configuración',
        error: error.message
      });
    }
  },

  // Obtener una configuración específica
  getSetting: async (req, res) => {
    try {
      const { key } = req.params;
      
      const query = `
        SELECT * FROM configuraciones_sitio
        WHERE clave = $1
      `;
      
      const result = await db.pool.query(query, [key]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Configuración '${key}' no encontrada`
        });
      }
      
      const setting = result.rows[0];
      let valor = setting.valor;
      
      // Parsear valor según tipo
      if (setting.tipo === 'json' && valor) {
        try {
          valor = JSON.parse(valor);
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      } else if (setting.tipo === 'number' && valor) {
        valor = Number(valor);
      } else if (setting.tipo === 'boolean' && valor) {
        valor = valor.toLowerCase() === 'true';
      }
      
      res.json({
        success: true,
        setting: {
          key: setting.clave,
          value: valor,
          type: setting.tipo,
          description: setting.descripcion,
          updatedAt: setting.fecha_actualizacion
        }
      });
    } catch (error) {
      console.error('Error en getSetting:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración',
        error: error.message
      });
    }
  }
};

module.exports = SiteSettingsController;
