/**
 * 🌍 CONFIGURACIÓN DE PAÍSES PARA ENVÍO INTERNACIONAL
 * Países soportados por el sistema híbrido de cotización
 */

export const SUPPORTED_COUNTRIES = [
  // 🇲🇽 México (Nacional - Siempre disponible)
  {
    code: 'MX',
    name: 'México',
    nameEn: 'Mexico',
    flag: '🇲🇽',
    isDefault: true,
    type: 'national',
    postalCodeFormat: '5 dígitos (12345)',
    example: '64000',
    priority: 1
  },

  // 🇺🇸 Estados Unidos
  {
    code: 'US',
    name: 'Estados Unidos',
    nameEn: 'United States',
    flag: '🇺🇸',
    type: 'international',
    postalCodeFormat: '5 dígitos (12345)',
    example: '90210',
    priority: 2
  },

  // 🇨🇦 Canadá
  {
    code: 'CA',
    name: 'Canadá',
    nameEn: 'Canada',
    flag: '🇨🇦',
    type: 'international',
    postalCodeFormat: 'Formato: A1A 1A1',
    example: 'M5V 3L9',
    priority: 3
  },

  // 🇬🇧 Reino Unido
  {
    code: 'GB',
    name: 'Reino Unido',
    nameEn: 'United Kingdom',
    flag: '🇬🇧',
    type: 'international',
    postalCodeFormat: 'Formato: SW1A 1AA',
    example: 'SW1A 1AA',
    priority: 4
  },

  // 🇩🇪 Alemania
  {
    code: 'DE',
    name: 'Alemania',
    nameEn: 'Germany',
    flag: '🇩🇪',
    type: 'international',
    postalCodeFormat: '5 dígitos (12345)',
    example: '10115',
    priority: 5
  },

  // 🇫🇷 Francia
  {
    code: 'FR',
    name: 'Francia',
    nameEn: 'France',
    flag: '🇫🇷',
    type: 'international',
    postalCodeFormat: '5 dígitos (12345)',
    example: '75001',
    priority: 6
  },

  // 🇪🇸 España
  {
    code: 'ES',
    name: 'España',
    nameEn: 'Spain',
    flag: '🇪🇸',
    type: 'international',
    postalCodeFormat: '5 dígitos (12345)',
    example: '28001',
    priority: 7
  },

  // 🇮🇹 Italia
  {
    code: 'IT',
    name: 'Italia',
    nameEn: 'Italy',
    flag: '🇮🇹',
    type: 'international',
    postalCodeFormat: '5 dígitos (12345)',
    example: '00118',
    priority: 8
  },

  // 🇯🇵 Japón
  {
    code: 'JP',
    name: 'Japón',
    nameEn: 'Japan',
    flag: '🇯🇵',
    type: 'international',
    postalCodeFormat: 'Formato: 123-4567',
    example: '100-0001',
    priority: 9
  },

  // 🇦🇺 Australia
  {
    code: 'AU',
    name: 'Australia',
    nameEn: 'Australia',
    flag: '🇦🇺',
    type: 'international',
    postalCodeFormat: '4 dígitos (1234)',
    example: '2000',
    priority: 10
  },

  // 🇧🇷 Brasil
  {
    code: 'BR',
    name: 'Brasil',
    nameEn: 'Brazil',
    flag: '🇧🇷',
    type: 'international',
    postalCodeFormat: 'Formato: 12345-678',
    example: '01310-100',
    priority: 11
  },

  // 🇦🇷 Argentina
  {
    code: 'AR',
    name: 'Argentina',
    nameEn: 'Argentina',
    flag: '🇦🇷',
    type: 'international',
    postalCodeFormat: '4 o 8 dígitos',
    example: 'C1425',
    priority: 12
  },

  // 🇨🇴 Colombia
  {
    code: 'CO',
    name: 'Colombia',
    nameEn: 'Colombia',
    flag: '🇨🇴',
    type: 'international',
    postalCodeFormat: '6 dígitos (123456)',
    example: '110111',
    priority: 13
  },

  // 🇵🇪 Perú
  {
    code: 'PE',
    name: 'Perú',
    nameEn: 'Peru',
    flag: '🇵🇪',
    type: 'international',
    postalCodeFormat: '5 dígitos (12345)',
    example: '15001',
    priority: 14
  },

  // 🇨🇱 Chile
  {
    code: 'CL',
    name: 'Chile',
    nameEn: 'Chile',
    flag: '🇨🇱',
    type: 'international',
    postalCodeFormat: '7 dígitos (1234567)',
    example: '8320000',
    priority: 15
  },

  // 🇳🇱 Países Bajos
  {
    code: 'NL',
    name: 'Países Bajos',
    nameEn: 'Netherlands',
    flag: '🇳🇱',
    type: 'international',
    postalCodeFormat: 'Formato: 1234 AB',
    example: '1012 JS',
    priority: 16
  }
];

// Función para obtener país por código
export const getCountryByCode = (code) => {
  return SUPPORTED_COUNTRIES.find(country => country.code === code);
};

// Función para obtener países ordenados por prioridad
export const getCountriesByPriority = () => {
  return SUPPORTED_COUNTRIES.sort((a, b) => a.priority - b.priority);
};

// Función para obtener solo países internacionales
export const getInternationalCountries = () => {
  return SUPPORTED_COUNTRIES.filter(country => country.type === 'international');
};

// Función para detectar país por código postal
export const detectCountryByPostalCode = (postalCode) => {
  // Patrones básicos de detección
  const patterns = {
    'MX': /^\d{5}$/, // México: 5 dígitos
    'US': /^\d{5}(-\d{4})?$/, // USA: 5 dígitos o 5+4
    'CA': /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, // Canadá: A1A 1A1
    'GB': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, // Reino Unido
    'DE': /^\d{5}$/, // Alemania: 5 dígitos
    'FR': /^\d{5}$/, // Francia: 5 dígitos
    'ES': /^\d{5}$/, // España: 5 dígitos
    'IT': /^\d{5}$/, // Italia: 5 dígitos
    'JP': /^\d{3}-\d{4}$/, // Japón: 123-4567
    'AU': /^\d{4}$/, // Australia: 4 dígitos
    'BR': /^\d{5}-\d{3}$/, // Brasil: 12345-678
    'NL': /^\d{4} ?[A-Z]{2}$/i // Países Bajos: 1234 AB
  };

  for (const [countryCode, pattern] of Object.entries(patterns)) {
    if (pattern.test(postalCode.trim())) {
      return getCountryByCode(countryCode);
    }
  }

  // Por defecto, si no se detecta, asumir México para CPs de 5 dígitos
  if (/^\d{5}$/.test(postalCode.trim())) {
    return getCountryByCode('MX');
  }

  return null;
};
