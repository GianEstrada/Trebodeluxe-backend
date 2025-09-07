const axios = require('axios');

/**
 * Clase para manejar la autenticación con SkyDropX
 */
class SkyDropXAuth {
  constructor() {
    // Usar las variables que tienes en Render
    this.clientId = process.env.SKYDROP_CLIENT_ID || process.env.SKYDROP_API_KEY;
    this.clientSecret = process.env.SKYDROP_CLIENT_SECRET || process.env.SKYDROP_API_SECRET;
    this.baseUrl = process.env.SKYDROP_BASE_URL || 'https://pro.skydropx.com/api/v1';
    this.tokenUrl = 'https://pro.skydropx.com/api/v1/oauth/token'; // ✅ URL correcta
    
    // Cache del token
    this.tokenCache = {
      token: null,
      expiresAt: null
    };
  }

  /**
   * Obtiene un token bearer válido de SkyDropX
   * @returns {Promise<string>} Token bearer
   */
  async getBearerToken() {
    try {
      // Verificar si tenemos un token válido en cache
      if (this.isTokenValid()) {
        console.log('🔄 Usando token existente del cache');
        return this.tokenCache.token;
      }

      console.log('🔐 Obteniendo nuevo token bearer de SkyDropX...');

      // Validar variables de entorno
      if (!this.clientId || !this.clientSecret) {
        throw new Error('SKYDROP_API_KEY y SKYDROP_API_SECRET son requeridas en las variables de entorno');
      }

      // Preparar datos para la autenticación OAuth2
      const authData = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        refresh_token: '',
        scope: 'default orders.create'
      };

      console.log('📤 Enviando solicitud de autenticación...');

      // Realizar la petición para obtener el token
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'client_credentials');
      params.append('redirect_uri', 'urn:ietf:wg:oauth:2.0:oob');
      params.append('refresh_token', '');
      params.append('scope', 'default orders.create');

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      });

      console.log('📥 Respuesta de autenticación recibida');
      console.log('🔍 STATUS AUTH:', response.status);
      console.log('🔍 HEADERS AUTH:', JSON.stringify(response.headers, null, 2));
      console.log('🔍 DATA AUTH COMPLETA:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.access_token) {
        const { access_token, expires_in } = response.data;
        
        console.log('🔍 TOKEN OBTENIDO:', access_token.substring(0, 20) + '...');
        console.log('🔍 EXPIRES_IN:', expires_in);
        
        // Guardar en cache (expires_in viene en segundos)
        this.tokenCache.token = access_token;
        this.tokenCache.expiresAt = Date.now() + (expires_in * 1000);

        console.log('✅ Token obtenido exitosamente');
        console.log(`⏰ Token válido por ${expires_in} segundos`);
        
        return access_token;
      } else {
        console.error('❌ Respuesta sin access_token:', response.data);
        throw new Error('Respuesta inválida del servidor de SkyDropX');
      }

    } catch (error) {
      console.error('❌ Error obteniendo token de SkyDropX:', error.message);
      
      if (error.response) {
        console.error('📋 Detalles del error de autenticación:');
        console.error('- Status:', error.response.status);
        console.error('- Status Text:', error.response.statusText);
        console.error('- Headers Error Auth:', JSON.stringify(error.response.headers, null, 2));
        console.error('- Data Error Auth:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.data) {
          console.error('🔍 ANÁLISIS ERROR AUTH:');
          console.error('- Tipo:', typeof error.response.data);
          console.error('- Keys:', Object.keys(error.response.data));
        }
      } else if (error.request) {
        console.error('📋 Error de conexión en auth - No hubo respuesta:');
        console.error('- Request:', error.request);
      } else {
        console.error('📋 Error configurando petición de auth:', error.message);
      }
      
      throw new Error(`Error de autenticación SkyDropX: ${error.message}`);
    }
  }

  /**
   * Verifica si el token actual es válido
   * @returns {boolean} True si el token es válido
   */
  isTokenValid() {
    if (!this.tokenCache.token || !this.tokenCache.expiresAt) {
      return false;
    }

    // Verificar si el token expira en los próximos 5 segundos (buffer de seguridad)
    const now = Date.now();
    const bufferTime = 5000; // 5 segundos
    
    return (this.tokenCache.expiresAt - now) > bufferTime;
  }

  /**
   * Fuerza la renovación del token
   * @returns {Promise<string>} Nuevo token bearer
   */
  async refreshToken() {
    console.log('🔄 Forzando renovación del token...');
    this.tokenCache.token = null;
    this.tokenCache.expiresAt = null;
    return await this.getBearerToken();
  }

  /**
   * Obtiene headers de autorización para las peticiones a SkyDropX
   * @returns {Promise<Object>} Headers con autorización
   */
  async getAuthHeaders() {
    const token = await this.getBearerToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Realiza una petición autenticada a la API de SkyDropX
   * @param {string} endpoint - Endpoint de la API (sin el baseUrl)
   * @param {Object} options - Opciones para axios
   * @returns {Promise<Object>} Respuesta de la API
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseUrl}${endpoint}`;

      const requestOptions = {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      };

      console.log(`📤 Realizando petición a: ${url}`);
      const response = await axios(url, requestOptions);
      
      console.log('✅ Petición exitosa');
      return response.data;

    } catch (error) {
      console.error('❌ Error en petición autenticada:', error.message);
      
      // Si es error 401, intentar renovar el token una vez
      if (error.response && error.response.status === 401) {
        console.log('🔄 Token posiblemente expirado, renovando...');
        try {
          await this.refreshToken();
          
          // Reintentar la petición con el nuevo token
          const headers = await this.getAuthHeaders();
          const url = `${this.baseUrl}${endpoint}`;
          
          const requestOptions = {
            ...options,
            headers: {
              ...headers,
              ...options.headers
            }
          };

          const response = await axios(url, requestOptions);
          console.log('✅ Petición exitosa después de renovar token');
          return response.data;

        } catch (retryError) {
          console.error('❌ Error después de renovar token:', retryError.message);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Obtiene información del token actual
   * @returns {Object} Información del token
   */
  getTokenInfo() {
    if (!this.isTokenValid()) {
      return { valid: false, message: 'No hay token válido' };
    }

    const remainingTime = Math.ceil((this.tokenCache.expiresAt - Date.now()) / 1000);
    
    return {
      valid: true,
      token: this.tokenCache.token.substring(0, 20) + '...', // Solo mostrar los primeros 20 caracteres
      expiresIn: remainingTime,
      expiresAt: new Date(this.tokenCache.expiresAt).toISOString()
    };
  }
}

// Exportar una instancia singleton
const skyDropXAuth = new SkyDropXAuth();

module.exports = {
  SkyDropXAuth,
  skyDropXAuth
};
