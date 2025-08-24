// Utilidades para manejo de precios
// utils/priceUtils.js

/**
 * Convierte un valor a número de manera segura
 * @param {*} value - El valor a convertir
 * @param {number} defaultValue - Valor por defecto si la conversión falla
 * @returns {number} - El número convertido o el valor por defecto
 */
const safeParseNumber = (value, defaultValue = 0) => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  
  return defaultValue;
};

/**
 * Convierte precios en un objeto de manera segura
 * @param {Object} obj - Objeto que contiene precios
 * @param {string[]} priceFields - Campos que contienen precios
 * @returns {Object} - Objeto con precios convertidos
 */
const convertPrices = (obj, priceFields = ['precio', 'precio_minimo', 'precio_maximo', 'precio_base', 'precio_unitario']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const converted = { ...obj };
  
  priceFields.forEach(field => {
    if (converted.hasOwnProperty(field)) {
      converted[field] = safeParseNumber(converted[field]);
    }
  });
  
  return converted;
};

/**
 * Convierte precios en un array de objetos
 * @param {Array} array - Array de objetos
 * @param {string[]} priceFields - Campos que contienen precios
 * @returns {Array} - Array con precios convertidos
 */
const convertPricesArray = (array, priceFields = ['precio', 'precio_minimo', 'precio_maximo', 'precio_base', 'precio_unitario']) => {
  if (!Array.isArray(array)) return array;
  
  return array.map(item => convertPrices(item, priceFields));
};

/**
 * Aplica conversión de precios a una respuesta de base de datos
 * @param {Object} dbResult - Resultado de la base de datos (con rows)
 * @param {string[]} priceFields - Campos que contienen precios
 * @returns {Object} - Resultado con precios convertidos
 */
const convertDbPrices = (dbResult, priceFields) => {
  if (!dbResult || !dbResult.rows) return dbResult;
  
  return {
    ...dbResult,
    rows: convertPricesArray(dbResult.rows, priceFields)
  };
};

module.exports = {
  safeParseNumber,
  convertPrices,
  convertPricesArray,
  convertDbPrices
};
