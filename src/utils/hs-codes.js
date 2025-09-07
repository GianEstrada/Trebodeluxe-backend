/**
 * Códigos del Sistema Armonizado (HS) más comunes para productos textiles
 * Fuente: USITC, WCO, Sistema Armonizado 2022
 * Actualizado: Septiembre 2025
 */

const HS_CODES_TEXTILES = {
  // ===== PLAYERAS Y CAMISETAS =====
  "6109.10.00": {
    description: "T-shirts, singlets and other vests, of cotton, knitted or crocheted",
    description_es: "Playeras, camisetas sin mangas y otras camisetas de algodón, tejidas",
    category: "Playeras de algodón",
    active: false, // Este código está obsoleto en algunos sistemas
    recommended: false
  },
  "6109.90.00": {
    description: "T-shirts, singlets and other vests, of other textile materials, knitted or crocheted",
    description_es: "Playeras, camisetas sin mangas y otras camisetas de otras materias textiles",
    category: "Playeras de otros materiales",
    active: true,
    recommended: true
  },
  "6205.20.20": {
    description: "Men's or boys' shirts of cotton (not knitted or crocheted)",
    description_es: "Camisas de hombre o niño, de algodón (no tejidas)",
    category: "Camisas de algodón",
    active: true,
    recommended: true
  },

  // ===== PANTALONES =====
  "6203.42.40": {
    description: "Men's or boys' trousers, bib and brace overalls, breeches and shorts of cotton",
    description_es: "Pantalones largos, pantalones con peto y tirantes, pantalones cortos de algodón para hombres",
    category: "Pantalones de algodón hombre",
    active: true,
    recommended: true
  },
  "6204.62.40": {
    description: "Women's or girls' trousers, bib and brace overalls, breeches and shorts of cotton",
    description_es: "Pantalones largos, pantalones con peto y tirantes, pantalones cortos de algodón para mujeres",
    category: "Pantalones de algodón mujer",
    active: true,
    recommended: true
  },
  "6203.43.40": {
    description: "Men's or boys' shorts of cotton (not knitted or crocheted)",
    description_es: "Pantalones cortos de algodón para hombres (no tejidos)",
    category: "Shorts de algodón hombre",
    active: true,
    recommended: true
  },

  // ===== SUDADERAS Y HOODIES =====
  "6110.20.20": {
    description: "Jerseys, pullovers, cardigans, waistcoats and similar articles, of cotton, knitted or crocheted",
    description_es: "Suéteres, pulóvers, cardiganes, chalecos y artículos similares, de algodón, tejidos",
    category: "Sudaderas de algodón",
    active: true,
    recommended: true
  },
  "6110.30.30": {
    description: "Jerseys, pullovers, cardigans, waistcoats and similar articles, of man-made fibres, knitted or crocheted",
    description_es: "Suéteres, pulóvers, cardiganes, chalecos y artículos similares, de fibras sintéticas",
    category: "Sudaderas sintéticas",
    active: true,
    recommended: true
  },

  // ===== VESTIDOS =====
  "6204.42.00": {
    description: "Women's or girls' dresses of cotton (not knitted or crocheted)",
    description_es: "Vestidos de algodón para mujeres o niñas (no tejidos)",
    category: "Vestidos de algodón",
    active: true,
    recommended: true
  },
  "6204.43.00": {
    description: "Women's or girls' dresses of synthetic fibres (not knitted or crocheted)",
    description_es: "Vestidos de fibras sintéticas para mujeres o niñas (no tejidos)",
    category: "Vestidos sintéticos",
    active: true,
    recommended: true
  },

  // ===== ACCESORIOS =====
  "6505.00.90": {
    description: "Hats and other headgear, knitted or crocheted, or made up from lace, felt or other textile materials",
    description_es: "Sombreros y demás tocados, tejidos o confeccionados con encajes, fieltro u otras materias textiles",
    category: "Gorras y sombreros",
    active: true,
    recommended: true
  },
  "6115.95.90": {
    description: "Hosiery, knitted or crocheted, of other textile materials",
    description_es: "Calcetería, tejida, de otras materias textiles",
    category: "Calcetines y medias",
    active: true,
    recommended: true
  },
  "6212.10.00": {
    description: "Brassieres, whether or not knitted or crocheted",
    description_es: "Sostenes (corpiños), incluso tejidos",
    category: "Ropa interior femenina",
    active: true,
    recommended: true
  },

  // ===== CÓDIGOS GENÉRICOS SEGUROS =====
  "6217.90.90": {
    description: "Other made up clothing accessories; parts of garments or of clothing accessories",
    description_es: "Los demás complementos de vestir confeccionados; partes de prendas o de complementos de vestir",
    category: "Accesorios textiles generales",
    active: true,
    recommended: true
  },
  "6307.90.98": {
    description: "Other made up articles of textile materials",
    description_es: "Los demás artículos confeccionados de materias textiles",
    category: "Artículos textiles diversos",
    active: true,
    recommended: true
  }
};

/**
 * Obtiene códigos HS recomendados para dropdown
 * @returns {Array} Array de códigos HS activos y recomendados
 */
function getRecommendedHSCodes() {
  return Object.entries(HS_CODES_TEXTILES)
    .filter(([code, data]) => data.active && data.recommended)
    .map(([code, data]) => ({
      code: code,
      description: data.description_es,
      description_en: data.description,
      category: data.category
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Obtiene todos los códigos HS disponibles
 * @returns {Array} Array de todos los códigos HS
 */
function getAllHSCodes() {
  return Object.entries(HS_CODES_TEXTILES)
    .map(([code, data]) => ({
      code: code,
      description: data.description_es,
      description_en: data.description,
      category: data.category,
      active: data.active,
      recommended: data.recommended
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Busca código HS por categoría de producto
 * @param {string} categoryName - Nombre de la categoría
 * @returns {string|null} Código HS sugerido o null
 */
function suggestHSCodeByCategory(categoryName) {
  const category = categoryName.toLowerCase();
  
  // Mapeo de palabras clave a códigos HS
  const categoryMapping = {
    'playera': '6109.90.00',
    'camiseta': '6109.90.00',
    't-shirt': '6109.90.00',
    'polo': '6109.90.00',
    'camisa': '6205.20.20',
    'pantalon': '6203.42.40',
    'jean': '6203.42.40',
    'pants': '6203.42.40',
    'short': '6203.43.40',
    'bermuda': '6203.43.40',
    'sudadera': '6110.20.20',
    'hoodie': '6110.20.20',
    'sweatshirt': '6110.20.20',
    'vestido': '6204.42.00',
    'dress': '6204.42.00',
    'gorra': '6505.00.90',
    'sombrero': '6505.00.90',
    'cap': '6505.00.90',
    'hat': '6505.00.90',
    'calcet': '6115.95.90',
    'media': '6115.95.90',
    'sock': '6115.95.90'
  };
  
  for (const [keyword, hsCode] of Object.entries(categoryMapping)) {
    if (category.includes(keyword)) {
      return hsCode;
    }
  }
  
  // Código genérico como fallback
  return '6217.90.90';
}

module.exports = {
  HS_CODES_TEXTILES,
  getRecommendedHSCodes,
  getAllHSCodes,
  suggestHSCodeByCategory
};
