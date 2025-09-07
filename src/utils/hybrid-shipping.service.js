/**
 * Servicio híbrido de envíos: Local + Nacional
 * Combina APIs locales para área metropolitana con SkyDropX para envíos nacionales
 */

const axios = require('axios');
const SkyDropXAuth = require('./skydropx-auth');

class HybridShippingService {
  constructor() {
    // Integración con SkyDropX existente
    this.skyDropXAuth = new SkyDropXAuth();
    this.skyDropXBaseUrl = process.env.SKYDROP_BASE_URL || 'https://pro.skydropx.com/api/v1';
    this.skyDropXAddressFrom = {
      name: "Trebode Luxe",
      company: "Trebode Luxe",
      street1: "Calle Principal 123",
      area_level3: "Centro",
      area_level2: "Ciudad de México",
      area_level1: "Ciudad de México",
      postal_code: "01000",
      country_code: "MX",
      phone: "5555555555"
    };
    // Configuración para determinar si es envío local o nacional
    this.localZones = {
      monterrey: {
        postalCodes: ['64', '66', '67'], // Códigos postales del área metropolitana
        localApis: ['uber_direct', 'rappi', 'ninety_nine_minutes']
      },
      guadalajara: {
        postalCodes: ['44', '45', '46'],
        localApis: ['uber_direct', 'rappi', 'ninety_nine_minutes']
      },
      cdmx: {
        postalCodes: ['01', '02', '03', '04', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16'],
        localApis: ['uber_direct', 'rappi', 'ninety_nine_minutes']
      }
    };

    // Configuración de APIs locales
    this.localApiConfigs = {
      uber_direct: {
        baseUrl: 'https://api.uber.com/v1/customers',
        apiKey: process.env.UBER_DIRECT_API_KEY,
        minDeliveryTime: 60, // 1 hora
        maxDeliveryTime: 180, // 3 horas
        maxDistance: 25 // km
      },
      rappi: {
        baseUrl: 'https://services.grability.rappi.com/api/partners',
        apiKey: process.env.RAPPI_API_KEY,
        minDeliveryTime: 45,
        maxDeliveryTime: 120,
        maxDistance: 20
      },
      ninety_nine_minutes: {
        baseUrl: 'https://delivery-api.99minutos.com/v2',
        apiKey: process.env.NINETY_NINE_API_KEY,
        minDeliveryTime: 90,
        maxDeliveryTime: 300,
        maxDistance: 30
      }
    };
  }

  /**
   * Determina si un envío es local basado en códigos postales
   */
  isLocalDelivery(postalCodeFrom, postalCodeTo) {
    const fromPrefix = postalCodeFrom.substring(0, 2);
    const toPrefix = postalCodeTo.substring(0, 2);

    // Buscar en qué zona está el código postal de origen
    for (const [zone, config] of Object.entries(this.localZones)) {
      if (config.postalCodes.includes(fromPrefix)) {
        // Si el destino también está en la misma zona, es envío local
        return config.postalCodes.includes(toPrefix) ? zone : false;
      }
    }
    return false;
  }

  /**
   * Calcula distancia aproximada entre dos códigos postales
   */
  async calculateDistance(postalCodeFrom, postalCodeTo) {
    // Aquí podrías integrar Google Maps API o similar
    // Por ahora usamos una aproximación básica
    
    const distances = {
      // Monterrey metropolitano
      '66450-66050': 12, // San Nicolás → Escobedo
      '64000-66450': 15, // Monterrey Centro → San Nicolás  
      '67000-66000': 20, // Guadalupe → San Pedro
      
      // Guadalajara metropolitano
      '44100-44200': 8,  // Centro → Zona Rosa
      '45000-44100': 12, // Zapopan → Centro
      
      // CDMX
      '06000-03100': 10, // Centro → Benito Juárez
      '11000-06000': 15, // Miguel Hidalgo → Centro
    };

    const key = `${postalCodeFrom}-${postalCodeTo}`;
    return distances[key] || 50; // Default 50km si no encontramos la distancia
  }

  /**
   * Obtiene cotizaciones de APIs locales
   */
  async getLocalQuotes(origin, destination, packageInfo) {
    const localZone = this.isLocalDelivery(origin.postalCode, destination.postalCode);
    
    if (!localZone) {
      return { isLocal: false, quotes: [] };
    }

    const distance = await this.calculateDistance(origin.postalCode, destination.postalCode);
    const quotes = [];

    // Uber Direct
    if (this.localApiConfigs.uber_direct.apiKey && distance <= this.localApiConfigs.uber_direct.maxDistance) {
      try {
        const uberQuote = await this.getUberDirectQuote(origin, destination, packageInfo);
        if (uberQuote) quotes.push(uberQuote);
      } catch (error) {
        console.log('Error Uber Direct:', error.message);
      }
    }

    // 99 Minutos
    if (this.localApiConfigs.ninety_nine_minutes.apiKey && distance <= this.localApiConfigs.ninety_nine_minutes.maxDistance) {
      try {
        const ninetyNineQuote = await this.getNinetyNineQuote(origin, destination, packageInfo);
        if (ninetyNineQuote) quotes.push(ninetyNineQuote);
      } catch (error) {
        console.log('Error 99 Minutos:', error.message);
      }
    }

    // Rappi
    if (this.localApiConfigs.rappi.apiKey && distance <= this.localApiConfigs.rappi.maxDistance) {
      try {
        const rappiQuote = await this.getRappiQuote(origin, destination, packageInfo);
        if (rappiQuote) quotes.push(rappiQuote);
      } catch (error) {
        console.log('Error Rappi:', error.message);
      }
    }

    return {
      isLocal: true,
      zone: localZone,
      distance: distance,
      quotes: quotes.sort((a, b) => a.price - b.price) // Ordenar por precio
    };
  }

  /**
   * Uber Direct API integration
   */
  async getUberDirectQuote(origin, destination, packageInfo) {
    const payload = {
      pickup_address: `${origin.street}, ${origin.city}, ${origin.state} ${origin.postalCode}`,
      dropoff_address: `${destination.street}, ${destination.city}, ${destination.state} ${destination.postalCode}`,
      pickup_phone_number: origin.phone,
      dropoff_phone_number: destination.phone,
      manifest_items: [{
        name: packageInfo.description || 'Paquete',
        quantity: 1,
        size: this.mapPackageSize(packageInfo.weight)
      }]
    };

    const response = await axios.post(
      `${this.localApiConfigs.uber_direct.baseUrl}/deliveries/quote`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.localApiConfigs.uber_direct.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      provider: 'Uber Direct',
      price: response.data.fee / 100, // Uber envía en centavos
      currency: 'MXN',
      estimatedTime: `${response.data.pickup_eta}-${response.data.dropoff_eta} min`,
      service: 'Express Local',
      type: 'local'
    };
  }

  /**
   * 99 Minutos API integration
   */
  async getNinetyNineQuote(origin, destination, packageInfo) {
    const payload = {
      from: {
        address: `${origin.street}, ${origin.city}`,
        postal_code: origin.postalCode,
        phone: origin.phone
      },
      to: {
        address: `${destination.street}, ${destination.city}`,
        postal_code: destination.postalCode,
        phone: destination.phone
      },
      package: {
        weight: packageInfo.weight,
        dimensions: {
          length: packageInfo.length,
          width: packageInfo.width,
          height: packageInfo.height
        }
      }
    };

    const response = await axios.post(
      `${this.localApiConfigs.ninety_nine_minutes.baseUrl}/quote`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.localApiConfigs.ninety_nine_minutes.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      provider: '99 Minutos',
      price: response.data.price,
      currency: 'MXN',
      estimatedTime: `${response.data.delivery_time} min`,
      service: 'Entrega Express',
      type: 'local'
    };
  }

  /**
   * Rappi API integration (simulado - necesitas acceso empresarial)
   */
  async getRappiQuote(origin, destination, packageInfo) {
    // Simulación - Rappi requiere un proceso de onboarding empresarial
    const basePrice = 80;
    const distance = await this.calculateDistance(origin.postalCode, destination.postalCode);
    const distancePrice = distance * 3; // $3 por km
    
    return {
      provider: 'Rappi Business',
      price: basePrice + distancePrice,
      currency: 'MXN',
      estimatedTime: '45-90 min',
      service: 'Rappi Express',
      type: 'local'
    };
  }

  /**
   * Mapea peso a tamaño para Uber
   */
  mapPackageSize(weight) {
    if (weight <= 2) return 'small';
    if (weight <= 10) return 'medium';
    if (weight <= 20) return 'large';
    return 'xlarge';
  }

  /**
   * Obtiene cotizaciones de SkyDropX (tu servicio existente)
   */
  async getSkyDropXQuotes(origin, destination, packageInfo) {
    try {
      console.log('📦 Obteniendo cotizaciones SkyDropX...');
      
      // Obtener token de autenticación
      const token = await this.skyDropXAuth.getBearerToken();
      
      // Preparar payload para SkyDropX
      const quotationPayload = {
        quotation: {
          order_id: `hybrid_${Date.now()}`,
          address_from: this.skyDropXAddressFrom,
          address_to: {
            name: destination.name || "Cliente",
            street1: destination.street,
            area_level3: destination.area_level3 || "Centro",
            area_level2: destination.city,
            area_level1: destination.state,
            postal_code: destination.postalCode,
            country_code: "MX",
            phone: destination.phone
          },
          parcels: [
            {
              length: Math.ceil(packageInfo.length || 20),
              width: Math.ceil(packageInfo.width || 15),
              height: Math.ceil(packageInfo.height || 10),
              weight: Math.ceil(packageInfo.weight || 2),
              declared_value: packageInfo.declaredValue || 1000
            }
          ],
          requested_carriers: [
            "paquetexpress",
            "fedex",
            "ups",
            "ampm",
            "estafeta", 
            "dhl",
            "ninetynineminutes",
            "sendex"
          ],
          shipment_type: "package",
          quote_type: "carrier"
        }
      };

      console.log('📤 Enviando solicitud a SkyDropX...');

      // Hacer petición a SkyDropX
      const response = await axios.post(
        `${this.skyDropXBaseUrl}/quotations`,
        quotationPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('📥 Respuesta de SkyDropX recibida');

      // Procesar respuesta y formatear para el sistema híbrido
      const skyDropXQuotes = [];
      
      if (response.data.rates && Array.isArray(response.data.rates)) {
        response.data.rates
          .filter(rate => rate.success === true)
          .forEach(rate => {
            skyDropXQuotes.push({
              provider: rate.provider_display_name,
              service: rate.provider_service_name,
              price: parseFloat(rate.total),
              currency: rate.currency_code || 'MXN',
              estimatedTime: `${rate.days} día(s)`,
              zone: rate.zone,
              type: 'national',
              rawData: rate
            });
          });
      }

      return skyDropXQuotes.sort((a, b) => a.price - b.price);

    } catch (error) {
      console.error('❌ Error en SkyDropX:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Método principal que combina local + nacional
   */
  async getShippingQuotes(origin, destination, packageInfo) {
    console.log('🚛 Obteniendo cotizaciones híbridas...');
    
    // Primero verificar si es envío local
    const localQuotes = await this.getLocalQuotes(origin, destination, packageInfo);
    
    // SIEMPRE obtener cotizaciones nacionales con SkyDropX para comparar
    console.log('📦 Obteniendo cotizaciones nacionales con SkyDropX...');
    const nationalQuotes = await this.getSkyDropXQuotes(origin, destination, packageInfo);

    // Combinar todas las opciones
    const allQuotes = [...localQuotes.quotes, ...nationalQuotes];

    return {
      isLocalDelivery: localQuotes.isLocal,
      zone: localQuotes.zone,
      distance: localQuotes.distance,
      localOptions: localQuotes.quotes,
      nationalOptions: nationalQuotes,
      allOptions: allQuotes.sort((a, b) => a.price - b.price),
      recommendation: this.getRecommendation(localQuotes.quotes, nationalQuotes),
      skyDropXRawData: nationalQuotes.length > 0 ? nationalQuotes[0].rawData : null
    };
  }

  /**
   * Recomienda la mejor opción
   */
  getRecommendation(localQuotes, nationalQuotes) {
    const allQuotes = [...localQuotes, ...nationalQuotes];
    
    if (allQuotes.length === 0) {
      return { type: 'none', message: 'No hay opciones de envío disponibles' };
    }

    // Si hay opciones locales rápidas (< 3 horas), recomendarlas para envíos locales
    const fastLocal = localQuotes.filter(q => {
      if (q.estimatedTime.includes('min')) {
        const minutes = parseInt(q.estimatedTime);
        return minutes < 180;
      }
      return false;
    });

    if (fastLocal.length > 0) {
      const cheapestFast = fastLocal.sort((a, b) => a.price - b.price)[0];
      return {
        type: 'local_fast',
        quote: cheapestFast,
        message: `🚀 Entrega rápida local: ${cheapestFast.provider} en ${cheapestFast.estimatedTime} por $${cheapestFast.price} MXN`
      };
    }

    // Si no hay opciones locales rápidas, buscar la más barata entre todas
    const cheapest = allQuotes.sort((a, b) => a.price - b.price)[0];
    const deliveryType = cheapest.type === 'local' ? 'envío local' : 'envío nacional';
    
    return {
      type: cheapest.type,
      quote: cheapest,
      message: `💰 Opción más económica (${deliveryType}): ${cheapest.provider} - $${cheapest.price} MXN en ${cheapest.estimatedTime}`
    };
  }
}

module.exports = HybridShippingService;
