const axios = require('axios');
const database = require('../config/database');

class SkyDropXService {
  constructor() {
    this.baseUrl = process.env.SKYDROP_BASE_URL || 'https://api.skydropx.com/v1';
    this.apiKey = process.env.SKYDROP_API_KEY;
    this.apiSecret = process.env.SKYDROP_API_SECRET;
    this.fromZip = process.env.SKYDROP_FROM_ZIP || '01000';
  }

  // Configurar headers para las peticiones
  getHeaders() {
    return {
      'Authorization': `Token token="${this.apiKey}"`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Obtener configuraciones desde la base de datos
  async getConfig() {
    try {
      const result = await database.query(`
        SELECT clave, valor 
        FROM configuraciones_sitio 
        WHERE clave LIKE 'skydropx%' OR clave LIKE 'empaque%'
      `);
      
      const config = {};
      result.rows.forEach(row => {
        config[row.clave] = row.valor;
      });
      
      return config;
    } catch (error) {
      console.error('Error obteniendo configuración SkyDropX:', error);
      throw error;
    }
  }

  // Verificar si SkyDropX está habilitado
  async isEnabled() {
    const config = await this.getConfig();
    return config.skydropx_enabled === 'true';
  }

  // Probar conexión con la API de SkyDropX
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      return {
        success: true,
        data: response.data,
        message: 'Conexión exitosa con SkyDropX'
      };
    } catch (error) {
      console.error('Error probando conexión SkyDropX:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Error al conectar con SkyDropX'
      };
    }
  }

  // Obtener cotizaciones de envío
  async getQuote(shipmentData) {
    try {
      if (!await this.isEnabled()) {
        throw new Error('SkyDropX no está habilitado');
      }

      const config = await this.getConfig();
      
      const quoteData = {
        zip_from: this.fromZip,
        zip_to: shipmentData.zip_to,
        parcel: {
          width: shipmentData.width,
          height: shipmentData.height,
          length: shipmentData.length,
          weight: shipmentData.weight
        }
      };

      const response = await axios.post(`${this.baseUrl}/quotations`, quoteData, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return {
        success: true,
        data: response.data,
        quotations: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error obteniendo cotización SkyDropX:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Error al obtener cotización de envío'
      };
    }
  }

  // Crear un envío
  async createShipment(shipmentData) {
    try {
      if (!await this.isEnabled()) {
        throw new Error('SkyDropX no está habilitado');
      }

      const config = await this.getConfig();
      
      const createData = {
        address_from: {
          zip: this.fromZip,
          country: 'MX'
        },
        address_to: {
          zip: shipmentData.address_to.zip,
          country: 'MX',
          province: shipmentData.address_to.province,
          city: shipmentData.address_to.city,
          name: shipmentData.address_to.name,
          company: shipmentData.address_to.company || '',
          address1: shipmentData.address_to.address1,
          address2: shipmentData.address_to.address2 || '',
          phone: shipmentData.address_to.phone,
          email: shipmentData.address_to.email
        },
        parcels: [{
          width: shipmentData.parcel.width,
          height: shipmentData.parcel.height,
          length: shipmentData.parcel.length,
          weight: shipmentData.parcel.weight
        }],
        consignment_note_class_code: shipmentData.service_level_code,
        consignment_note_packaging_code: shipmentData.packaging_code || 1
      };

      const response = await axios.post(`${this.baseUrl}/shipments`, createData, {
        headers: this.getHeaders(),
        timeout: 30000
      });

      return {
        success: true,
        data: response.data,
        shipment: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error creando envío SkyDropX:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Error al crear envío'
      };
    }
  }

  // Obtener información de tracking
  async getTracking(trackingNumber) {
    try {
      const response = await axios.get(`${this.baseUrl}/trackings/${trackingNumber}`, {
        headers: this.getHeaders(),
        timeout: 15000
      });

      return {
        success: true,
        data: response.data,
        tracking: response.data.data || response.data
      };
    } catch (error) {
      console.error('Error obteniendo tracking SkyDropX:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Error al obtener información de tracking'
      };
    }
  }

  // Calcular dimensiones de envío para una categoría
  async calculateShippingDimensions(categoryId) {
    try {
      const result = await database.query(`
        SELECT calcular_dimensiones_envio($1) as dimensions
      `, [categoryId]);

      if (result.rows.length > 0 && result.rows[0].dimensions) {
        return {
          success: true,
          dimensions: result.rows[0].dimensions
        };
      }

      return {
        success: false,
        message: 'No se pudieron calcular las dimensiones'
      };
    } catch (error) {
      console.error('Error calculando dimensiones:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al calcular dimensiones de envío'
      };
    }
  }

  // Obtener cotización para una categoría específica
  async getQuoteForCategory(categoryId, destinationZip) {
    try {
      const dimensionsResult = await this.calculateShippingDimensions(categoryId);
      
      if (!dimensionsResult.success) {
        return dimensionsResult;
      }

      const dimensions = dimensionsResult.dimensions;
      
      return await this.getQuote({
        zip_to: destinationZip,
        width: dimensions.ancho_final,
        height: dimensions.alto_final,
        length: dimensions.largo_final,
        weight: dimensions.peso_final
      });
    } catch (error) {
      console.error('Error obteniendo cotización para categoría:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener cotización para la categoría'
      };
    }
  }

  // Webhook handler para recibir actualizaciones de estado
  async handleWebhook(webhookData) {
    try {
      console.log('Recibido webhook SkyDropX:', webhookData);
      
      // Aquí puedes procesar las actualizaciones de estado
      // Por ejemplo, actualizar el estado de un pedido en tu base de datos
      
      return {
        success: true,
        message: 'Webhook procesado correctamente'
      };
    } catch (error) {
      console.error('Error procesando webhook SkyDropX:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error al procesar webhook'
      };
    }
  }
}

module.exports = new SkyDropXService();
