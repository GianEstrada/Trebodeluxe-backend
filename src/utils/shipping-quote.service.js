const { SkyDropXAuth } = require('./skydropx-auth');
const db = require('../config/db');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ShippingQuoteService {
  constructor() {
    this.skyDropXAuth = new SkyDropXAuth();
    this.baseUrl = 'https://pro.skydropx.com/api/v1';
    
    // Cache para códigos postales
    this.postalCodeCache = new Map();
    this.postalCodeDataLoaded = false;
    
    // Configuración del origen (Monterrey, NL)
    this.addressFrom = {
      country_code: "MX",
      postal_code: "64000",
      area_level1: "Nuevo León",
      area_level2: "Monterrey",
      area_level3: "Monterrey Centro"
    };
    
    // Paqueterías disponibles - incluir más opciones para mejor cobertura
    this.requestedCarriers = [
      "paquetexpress",
      "fedex",
      "dhl",
      "estafeta"
    ];
  }

  /**
   * Carga los códigos postales desde archivo CPdescarga.txt
   * @returns {Promise<void>}
   */
  async loadPostalCodeData() {
    if (this.postalCodeDataLoaded) return;
    
    try {
      console.log('📂 Cargando base de datos de códigos postales...');
      
      // Intentar múltiples rutas para mayor compatibilidad
      const possiblePaths = [
        path.join(__dirname, '..', 'Data', 'CPdescarga.txt'),   // Actual ubicación
        path.join(__dirname, '..', 'data', 'CPdescarga.txt'),  // Minúsculas
        path.join(process.cwd(), 'src', 'Data', 'CPdescarga.txt'), // Desde root
        path.join(process.cwd(), 'src', 'data', 'CPdescarga.txt')  // Desde root minúsculas
      ];
      
      let filePath = null;
      for (const testPath of possiblePaths) {
        try {
          await fs.access(testPath);
          filePath = testPath;
          console.log(`✅ Archivo encontrado en: ${filePath}`);
          break;
        } catch {
          // Continuar con la siguiente ruta
        }
      }
      
      if (!filePath) {
        throw new Error('Archivo CPdescarga.txt no encontrado en ninguna ubicación esperada');
      }
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      const lines = fileContent.split('\n');
      let loadedCount = 0;
      let processedCPs = new Set();
      
      for (const line of lines) {
        if (line.trim() && line.includes('|')) {
          const parts = line.split('|');
          
          // Formato SEPOMEX: CP|Colonia|Tipo|Municipio|Estado|Ciudad|...
          if (parts.length >= 5) {
            const cp = parts[0].trim();
            const colonia = parts[1].trim();
            const municipio = parts[3].trim(); 
            const estado = parts[4].trim();
            
            // Validar que el CP sea numérico de 5 dígitos
            if (/^\d{5}$/.test(cp) && estado && municipio && colonia) {
              // Si ya tenemos este CP, preferir la primera colonia encontrada
              if (!processedCPs.has(cp)) {
                this.postalCodeCache.set(cp, {
                  country_code: "MX",
                  postal_code: cp,
                  area_level1: estado,
                  area_level2: municipio,
                  area_level3: colonia
                });
                processedCPs.add(cp);
                loadedCount++;
              }
            }
          }
        }
      }
      
      console.log(`✅ Códigos postales cargados: ${loadedCount}`);
      this.postalCodeDataLoaded = true;
      
    } catch (error) {
      console.error('❌ Error cargando códigos postales:', error.message);
      console.log('🔄 Continuando con APIs externas como fallback...');
    }
  }

  /**
   * Obtiene los datos completos del carrito con productos, variantes y categorías
   * @param {string} cartId - ID del carrito
   * @returns {Promise<Object>} Datos del carrito con dimensiones calculadas
   */
  async getCartShippingData(cartId) {
    try {
      console.log('🛒 Obteniendo datos del carrito para envío:', cartId);

      // Primero verificar si el carrito existe
      const cartCheck = await db.query('SELECT id_carrito FROM carritos WHERE id_carrito = $1', [cartId]);
      if (cartCheck.rows.length === 0) {
        throw new Error(`Carrito con ID ${cartId} no encontrado`);
      }

      const query = `
        SELECT 
          cc.id_contenido,
          cc.cantidad,
          p.id_producto,
          CONCAT(p.nombre, ' - ', v.nombre) as producto_nombre,
          s.precio,
          p.id_categoria,
          c.nombre as categoria_nombre,
          c.hs_code as categoria_hs_code,
          c.alto_cm,
          c.largo_cm,
          c.ancho_cm,
          c.peso_kg,
          c.nivel_compresion,
          v.id_variante,
          v.nombre as variante_nombre,
          t.id_talla,
          t.nombre_talla as talla_nombre
        FROM contenido_carrito cc
        INNER JOIN productos p ON cc.id_producto = p.id_producto
        INNER JOIN categorias c ON p.id_categoria = c.id_categoria
        INNER JOIN variantes v ON cc.id_variante = v.id_variante
        INNER JOIN tallas t ON cc.id_talla = t.id_talla
        INNER JOIN stock s ON cc.id_producto = s.id_producto 
                           AND cc.id_variante = s.id_variante 
                           AND cc.id_talla = s.id_talla
        WHERE cc.id_carrito = $1
        ORDER BY cc.fecha_agregado
      `;

      const result = await db.query(query, [cartId]);
      
      console.log('📋 Resultado de consulta del carrito:', {
        rowCount: result.rows.length,
        cartId: cartId
      });
      
      // ==========================================
      // 🔍 LOG DETALLADO DE DATOS DEL CARRITO
      // ==========================================
      console.log('🔍 ==========================================');
      console.log('🔍 DATOS COMPLETOS DEL CARRITO:');
      console.log('🔍 ==========================================');
      console.log('🛒 Cart ID:', cartId);
      console.log('📊 Total de items encontrados:', result.rows.length);
      console.log('');
      console.log('📋 ITEMS DEL CARRITO (DETALLE COMPLETO):');
      console.log('-------------------------------------');
      result.rows.forEach((item, index) => {
        console.log(`📦 Item ${index + 1}:`);
        console.log(`   🆔 ID Contenido: ${item.id_contenido}`);
        console.log(`   📝 Producto: ${item.producto_nombre}`);
        console.log(`   🔢 Cantidad: ${item.cantidad}`);
        console.log(`   💰 Precio: $${item.precio}`);
        console.log(`   🏷️  Categoría: ${item.categoria_nombre} (ID: ${item.id_categoria})`);
        console.log(`   🏛️  Código HS: ${item.categoria_hs_code || 'NO DEFINIDO'}`);
        console.log(`   📏 Dimensiones: ${item.largo_cm}x${item.ancho_cm}x${item.alto_cm} cm`);
        console.log(`   ⚖️  Peso: ${item.peso_kg} kg`);
        console.log(`   🗜️  Compresión: ${item.nivel_compresion}`);
        console.log(`   🎨 Variante: ${item.variante_nombre} (ID: ${item.id_variante})`);
        console.log(`   📐 Talla: ${item.talla_nombre} (ID: ${item.id_talla})`);
        console.log('   ---');
      });
      console.log('🔍 ==========================================');
      
      if (result.rows.length === 0) {
        throw new Error('Carrito vacío o no encontrado');
      }

      // Calcular dimensiones totales del envío
      const shippingData = this.calculateShippingDimensions(result.rows);
      
      console.log('📦 Datos del carrito calculados:', {
        items: result.rows.length,
        totalWeight: shippingData.totalWeight,
        dimensions: shippingData.dimensions
      });

      return {
        cartItems: result.rows,
        ...shippingData
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo datos del carrito:', error);
      throw error;
    }
  }

  /**
   * Calcula las dimensiones totales de envío basado en los productos del carrito
   * @param {Array} cartItems - Items del carrito
   * @returns {Object} Dimensiones calculadas
   */
  calculateShippingDimensions(cartItems) {
    console.log('🔍 ==========================================');
    console.log('🔍 CALCULANDO DIMENSIONES DE ENVÍO:');
    console.log('🔍 ==========================================');
    
    let totalWeight = 0;
    let totalVolume = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;
    let totalValue = 0; // Agregar cálculo del valor total

    console.log('📊 PROCESANDO ITEMS INDIVIDUALES:');
    console.log('-------------------------------------');

    cartItems.forEach((item, index) => {
      const quantity = item.cantidad;
      const itemWeight = parseFloat(item.peso_kg || 0) * quantity;
      const itemHeight = parseFloat(item.alto_cm || 0);
      const itemLength = parseFloat(item.largo_cm || 0);
      const itemWidth = parseFloat(item.ancho_cm || 0);
      const itemPrice = parseFloat(item.precio || 0);
      const itemValue = itemPrice * quantity;
      
      console.log(`📦 Item ${index + 1}: ${item.producto_nombre}`);
      console.log(`   🔢 Cantidad: ${quantity}`);
      console.log(`   📏 Dimensiones: ${itemLength}x${itemWidth}x${itemHeight} cm`);
      console.log(`   ⚖️  Peso unitario: ${item.peso_kg} kg`);
      console.log(`   ⚖️  Peso total: ${itemWeight} kg`);
      console.log(`   💰 Precio unitario: $${itemPrice}`);
      console.log(`   💰 Valor total: $${itemValue}`);
      console.log('   ---');
      
      // Sumar peso total
      totalWeight += itemWeight;
      
      // Sumar valor total
      totalValue += itemValue;
      
      // Calcular volumen
      const itemVolume = itemHeight * itemLength * itemWidth * quantity;
      totalVolume += itemVolume;
      
      // Mantener las dimensiones máximas
      maxLength = Math.max(maxLength, itemLength);
      maxWidth = Math.max(maxWidth, itemWidth);
      totalHeight += itemHeight * quantity; // Apilar en altura
    });

    // Aplicar factor de compresión si es necesario
    const compressionFactor = this.getCompressionFactor(cartItems);
    const compressedHeight = totalHeight * compressionFactor;

    const result = {
      totalWeight: Math.max(totalWeight, 0.5), // Mínimo 0.5kg (500g) - corregido para KG
      totalValue: totalValue, // Valor total calculado
      dimensions: {
        length: Math.max(maxLength, 20), // Mínimo 20cm (más realista)
        width: Math.max(maxWidth, 15),   // Mínimo 15cm (más realista)  
        height: Math.max(compressedHeight, 8) // Mínimo 8cm (más realista)
      },
      compressionFactor: compressionFactor
    };

    console.log('');
    console.log('📊 CÁLCULOS FINALES:');
    console.log('-------------------------------------');
    console.log('⚖️  Peso total calculado:', totalWeight, 'kg');
    console.log('⚖️  Peso final (con mínimo):', result.totalWeight, 'kg');
    console.log('💰 Valor total calculado: $', totalValue);
    console.log('📦 Volumen total:', totalVolume, 'cm³');
    console.log('📏 Dimensión máxima largo:', maxLength, 'cm');
    console.log('📏 Dimensión máxima ancho:', maxWidth, 'cm');
    console.log('📏 Altura total sin comprimir:', totalHeight, 'cm');
    console.log('🗜️  Factor de compresión:', compressionFactor);
    console.log('📏 Altura final comprimida:', compressedHeight, 'cm');
    console.log('📦 DIMENSIONES FINALES:', JSON.stringify(result.dimensions, null, 2));
    console.log('🔍 ==========================================');

    return result;
  }

  /**
   * Obtiene el factor de compresión basado en las categorías de productos
   * @param {Array} cartItems - Items del carrito
   * @returns {number} Factor de compresión (0.1 a 1.0)
   */
  getCompressionFactor(cartItems) {
    // Obtener el factor de compresión promedio de las categorías
    let totalCompression = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
      if (item.nivel_compresion) {
        let compression;
        
        // Manejar tanto números como strings
        if (typeof item.nivel_compresion === 'number') {
          compression = item.nivel_compresion; // Usar directamente si es número
        } else if (typeof item.nivel_compresion === 'string') {
          switch(item.nivel_compresion.toLowerCase()) {
            case 'bajo':
              compression = 0.9; // 90% del volumen original
              break;
            case 'medio':
              compression = 0.7; // 70% del volumen original
              break;
            case 'alto':
              compression = 0.5; // 50% del volumen original
              break;
            default:
              compression = 0.7; // Por defecto medio
          }
        } else {
          compression = 0.7; // Fallback por defecto
        }
        
        totalCompression += compression;
        itemCount++;
      }
    });

    // Si no hay datos de compresión, usar factor conservador
    if (itemCount === 0) {
      return 0.7; // 70% de compresión por defecto
    }

    return Math.max(0.1, Math.min(1.0, totalCompression / itemCount));
  }

  /**
   * Obtiene datos de dirección basado en código postal
   * @param {string} postalCode - Código postal destino
   * @returns {Promise<Object>} Datos de la dirección
   */
  async getAddressFromPostalCode(postalCode) {
    try {
      console.log(`🔍 BÚSQUEDA DE CÓDIGO POSTAL: ${postalCode}`);
      console.log('=====================================');
      
      // Cargar datos locales si no están cargados
      await this.loadPostalCodeData();
      
      // PASO 1: Verificar cache local primero (CPdescarga.txt)
      console.log('📁 Paso 1: Buscando en base de datos local (CPdescarga.txt)...');
      if (this.postalCodeCache.has(postalCode)) {
        const localData = this.postalCodeCache.get(postalCode);
        console.log(`✅ CP ${postalCode} ENCONTRADO en base local`);
        console.log('📍 Datos locales:', JSON.stringify(localData, null, 2));
        return localData;
      }
      
      console.log(`❌ CP ${postalCode} NO encontrado en base local`);
      console.log(`📊 Total CPs en cache local: ${this.postalCodeCache.size}`);
      
      // PASO 2: Usar API Zippopotam como fallback
      console.log('🌐 Paso 2: Consultando API Zippopotam.us como fallback...');
      
      try {
        const zippopotamUrl = `http://api.zippopotam.us/mx/${postalCode}`;
        console.log('🔗 URL Zippopotam:', zippopotamUrl);
        
        const response = await fetch(zippopotamUrl);
        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('� Respuesta completa de Zippopotam:', JSON.stringify(data, null, 2));
          
          if (data && data.places && data.places[0]) {
            const place = data.places[0];
            
            // Mapear datos de Zippopotam al formato de SkyDropX
            const addressData = {
              country_code: "MX",
              postal_code: postalCode,
              area_level1: place.state || place['state abbreviation'] || "",
              area_level2: place['place name'] || "", // Ciudad/Municipio
              area_level3: place['place name'] || ""  // Colonia (usar mismo valor como fallback)
            };
            
            console.log('✅ CP encontrado en Zippopotam');
            console.log('🏷️  Estado:', addressData.area_level1);
            console.log('🏷️  Municipio:', addressData.area_level2);
            console.log('🏷️  Colonia:', addressData.area_level3);
            console.log('📍 Dirección final de Zippopotam:', JSON.stringify(addressData, null, 2));
            
            // Guardar en cache para futuras consultas
            this.postalCodeCache.set(postalCode, addressData);
            console.log('💾 CP guardado en cache local para futuras consultas');
            
            return addressData;
          } else {
            console.log('❌ Zippopotam: Respuesta sin datos válidos');
          }
        } else {
          console.log(`❌ Zippopotam: Error HTTP ${response.status}`);
        }
      } catch (zippopotamError) {
        console.log('❌ Error consultando Zippopotam:', zippopotamError.message);
      }
      
      // PASO 3: Fallback manual para CPs conocidos
      console.log('🔧 Paso 3: Usando fallback manual para CPs conocidos...');
      
      
      // PASO 3: Fallback manual para CPs conocidos comunes
      console.log('🔧 Paso 3: Usando fallback manual para CPs conocidos...');
      const knownPostalCodes = {
        // Área Metropolitana de Monterrey
        '64000': { area_level1: "Nuevo León", area_level2: "Monterrey", area_level3: "Centro" },
        '64100': { area_level1: "Nuevo León", area_level2: "Monterrey", area_level3: "Del Valle" },
        '64200': { area_level1: "Nuevo León", area_level2: "Monterrey", area_level3: "Obrera" },
        '66000': { area_level1: "Nuevo León", area_level2: "San Nicolás de los Garza", area_level3: "Centro" },
        '66050': { area_level1: "Nuevo León", area_level2: "General Escobedo", area_level3: "Centro" },
        '66058': { area_level1: "Nuevo León", area_level2: "General Escobedo", area_level3: "Praderas de San José" },
        '66450': { area_level1: "Nuevo León", area_level2: "San Nicolás de los Garza", area_level3: "Centro" },
        
        // Ciudad de México
        '01000': { area_level1: "Ciudad de México", area_level2: "Álvaro Obregón", area_level3: "Colonia del Valle" },
        '06000': { area_level1: "Ciudad de México", area_level2: "Cuauhtémoc", area_level3: "Centro" },
        '11000': { area_level1: "Ciudad de México", area_level2: "Miguel Hidalgo", area_level3: "Lomas de Chapultepec" },
        
        // Guadalajara
        '44100': { area_level1: "Jalisco", area_level2: "Guadalajara", area_level3: "Centro" },
        '44200': { area_level1: "Jalisco", area_level2: "Guadalajara", area_level3: "Americana" },
        '44300': { area_level1: "Jalisco", area_level2: "Guadalajara", area_level3: "Lafayette" }
      };
      
      if (knownPostalCodes[postalCode]) {
        const fallbackData = {
          country_code: "MX",
          postal_code: postalCode,
          ...knownPostalCodes[postalCode]
        };
        
        console.log('✅ CP encontrado en fallback manual');
        console.log('📍 Datos fallback:', JSON.stringify(fallbackData, null, 2));
        
        // Guardar en cache para futuras consultas
        this.postalCodeCache.set(postalCode, fallbackData);
        console.log('💾 CP guardado en cache desde fallback manual');
        
        return fallbackData;
      }
      
      // PASO 4: Error - no se pudo encontrar información
      console.log('❌ Paso 4: CP no encontrado en ninguna fuente');
      console.log(`🔍 Fuentes consultadas:
        ❌ Base local (CPdescarga.txt): ${this.postalCodeCache.size} CPs disponibles
        ❌ Zippopotam.us API
        ❌ Fallback manual: ${Object.keys(knownPostalCodes).length} CPs conocidos`);
      
      throw new Error(`No se pudo obtener información del código postal ${postalCode} en ninguna fuente disponible`);
      
    } catch (error) {
      console.error('❌ ERROR GENERAL obteniendo datos de dirección:', error.message);
      console.error('🔍 Stack trace:', error.stack);
      
      // PASO 5: Fallback genérico como último recurso
      console.log('🆘 Paso 5: Usando fallback genérico como último recurso...');
      console.log('⚠️  ADVERTENCIA: Usando datos genéricos - puede afectar precisión de cotizaciones');
      
      const genericFallback = {
        country_code: "MX",
        postal_code: postalCode,
        area_level1: "México", // Estado genérico
        area_level2: "Ciudad", // Ciudad genérica  
        area_level3: "Centro"  // Colonia genérica
      };
      
      console.log('📍 Datos genéricos aplicados:', JSON.stringify(genericFallback, null, 2));
      console.log('=====================================');
      
      return genericFallback;
    }
  }

  /**
   * Detecta el país basado en el código postal
   * @param {string} postalCode - Código postal a analizar
   * @returns {Object} Información del país detectado
   */
  detectCountryFromPostalCode(postalCode) {
    // Patrones de códigos postales por país
    const countryPatterns = {
      // México: 5 dígitos
      MX: { pattern: /^\d{5}$/, name: "México" },
      // Estados Unidos: 5 dígitos o 5-4 dígitos
      US: { pattern: /^\d{5}(-\d{4})?$/, name: "Estados Unidos" },
      // Canadá: formato A1A 1A1
      CA: { pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, name: "Canadá" },
      // Reino Unido: varios formatos
      GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, name: "Reino Unido" },
      // Francia: 5 dígitos
      FR: { pattern: /^\d{5}$/, name: "Francia" },
      // Alemania: 5 dígitos
      DE: { pattern: /^\d{5}$/, name: "Alemania" },
      // España: 5 dígitos
      ES: { pattern: /^\d{5}$/, name: "España" },
      // Italia: 5 dígitos
      IT: { pattern: /^\d{5}$/, name: "Italia" },
      // Brasil: 8 dígitos (formato 00000-000)
      BR: { pattern: /^\d{5}-?\d{3}$/, name: "Brasil" },
      // Argentina: 4 dígitos o formato A0000AAA
      AR: { pattern: /^(\d{4}|[A-Z]\d{4}[A-Z]{3})$/i, name: "Argentina" },
      // Colombia: 6 dígitos
      CO: { pattern: /^\d{6}$/, name: "Colombia" },
      // Chile: 7 dígitos
      CL: { pattern: /^\d{7}$/, name: "Chile" },
      // Australia: 4 dígitos
      AU: { pattern: /^\d{4}$/, name: "Australia" },
      // India: 6 dígitos
      IN: { pattern: /^\d{6}$/, name: "India" },
      // China: 6 dígitos
      CN: { pattern: /^\d{6}$/, name: "China" },
      // Japón: 7 dígitos (formato 000-0000)
      JP: { pattern: /^\d{3}-?\d{4}$/, name: "Japón" }
    };

    // Limpiar el código postal
    const cleanPostalCode = postalCode.toString().trim().toUpperCase();
    
    // Primero verificar México como prioridad (nuestro mercado principal)
    if (countryPatterns.MX.pattern.test(cleanPostalCode)) {
      return { countryCode: 'MX', countryName: 'México', cleanPostalCode };
    }
    
    // Luego verificar otros países
    for (const [code, info] of Object.entries(countryPatterns)) {
      if (code !== 'MX' && info.pattern.test(cleanPostalCode)) {
        return { countryCode: code, countryName: info.name, cleanPostalCode };
      }
    }
    
    // Si no coincide con ningún patrón, asumir México como fallback
    console.log(`⚠️  Patrón de CP no reconocido: ${postalCode}, asumiendo México`);
    return { countryCode: 'MX', countryName: 'México', cleanPostalCode };
  }

  /**
   * Obtiene datos de API específica por país
   * @param {string} countryCode - Código del país
   * @param {string} postalCode - Código postal
   * @returns {Promise<Object|null>} Datos de la dirección o null si no se encuentra
   */
  async getCountrySpecificPostalData(countryCode, postalCode) {
    try {
      console.log(`🔧 Intentando API específica para ${countryCode}: ${postalCode}`);
      
      switch (countryCode) {
        case 'US':
          // Para Estados Unidos podríamos usar USPS API o otra
          console.log('🇺🇸 API específica de Estados Unidos no implementada');
          return null;
          
        case 'CA':
          // Para Canadá podríamos usar Canada Post API
          console.log('🇨🇦 API específica de Canadá no implementada');
          return null;
          
        case 'BR':
          // Para Brasil podríamos usar ViaCEP
          try {
            const cleanCP = postalCode.replace(/\D/g, '');
            if (cleanCP.length === 8) {
              const url = `https://viacep.com.br/ws/${cleanCP}/json/`;
              console.log(`🇧🇷 Consultando ViaCEP Brasil: ${url}`);
              
              const response = await fetch(url);
              if (response.ok) {
                const data = await response.json();
                if (data && !data.erro) {
                  return {
                    country_code: 'BR',
                    country_name: 'Brasil',
                    postal_code: postalCode,
                    area_level1: data.uf || '',
                    area_level2: data.localidade || '',
                    area_level3: data.bairro || '',
                    latitude: null,
                    longitude: null
                  };
                }
              }
            }
          } catch (error) {
            console.log('❌ Error consultando ViaCEP:', error.message);
          }
          return null;
          
        default:
          console.log(`❌ No hay API específica implementada para ${countryCode}`);
          return null;
      }
    } catch (error) {
      console.log(`❌ Error en API específica para ${countryCode}:`, error.message);
      return null;
    }
  }

  /**
   * Obtiene datos de fallback manual internacional
   * @param {string} countryCode - Código del país
   * @param {string} postalCode - Código postal
   * @returns {Object|null} Datos de fallback o null si no se encuentra
   */
  getInternationalManualFallback(countryCode, postalCode) {
    console.log(`🗺️  Buscando fallback manual para ${countryCode}: ${postalCode}`);
    
    const internationalFallbacks = {
      // México - CPs conocidos importantes
      MX: {
        '64000': { area_level1: "Nuevo León", area_level2: "Monterrey", area_level3: "Centro" },
        '64100': { area_level1: "Nuevo León", area_level2: "Monterrey", area_level3: "Del Valle" },
        '64200': { area_level1: "Nuevo León", area_level2: "Monterrey", area_level3: "Obrera" },
        '66000': { area_level1: "Nuevo León", area_level2: "San Nicolás de los Garza", area_level3: "Centro" },
        '01000': { area_level1: "Ciudad de México", area_level2: "Álvaro Obregón", area_level3: "Colonia del Valle" },
        '06000': { area_level1: "Ciudad de México", area_level2: "Cuauhtémoc", area_level3: "Centro" },
        '44100': { area_level1: "Jalisco", area_level2: "Guadalajara", area_level3: "Centro" }
      },
      
      // Estados Unidos - ZIP codes importantes
      US: {
        '10001': { area_level1: "New York", area_level2: "New York", area_level3: "Manhattan" },
        '90210': { area_level1: "California", area_level2: "Beverly Hills", area_level3: "Beverly Hills" },
        '60601': { area_level1: "Illinois", area_level2: "Chicago", area_level3: "Downtown" },
        '33101': { area_level1: "Florida", area_level2: "Miami", area_level3: "Downtown" },
        '75201': { area_level1: "Texas", area_level2: "Dallas", area_level3: "Downtown" }
      },
      
      // Canadá - Códigos postales importantes
      CA: {
        'M5V 3M6': { area_level1: "Ontario", area_level2: "Toronto", area_level3: "Downtown" },
        'H3A 0G4': { area_level1: "Quebec", area_level2: "Montreal", area_level3: "Downtown" },
        'V6B 2W9': { area_level1: "British Columbia", area_level2: "Vancouver", area_level3: "Downtown" }
      },
      
      // España - Códigos importantes
      ES: {
        '28001': { area_level1: "Madrid", area_level2: "Madrid", area_level3: "Centro" },
        '08001': { area_level1: "Barcelona", area_level2: "Barcelona", area_level3: "Ciutat Vella" },
        '41001': { area_level1: "Sevilla", area_level2: "Sevilla", area_level3: "Centro" }
      },
      
      // Brasil - CEPs importantes
      BR: {
        '01310-100': { area_level1: "SP", area_level2: "São Paulo", area_level3: "Bela Vista" },
        '20040-020': { area_level1: "RJ", area_level2: "Rio de Janeiro", area_level3: "Centro" },
        '70040-010': { area_level1: "DF", area_level2: "Brasília", area_level3: "Asa Norte" }
      }
    };
    
    const countryData = internationalFallbacks[countryCode];
    if (countryData && countryData[postalCode]) {
      const fallbackData = {
        country_code: countryCode,
        country_name: this.detectCountryFromPostalCode(postalCode).countryName,
        postal_code: postalCode,
        ...countryData[postalCode],
        latitude: null,
        longitude: null
      };
      
      console.log(`✅ Fallback manual encontrado para ${countryCode}: ${postalCode}`);
      return fallbackData;
    }
    
    console.log(`❌ No hay fallback manual para ${countryCode}: ${postalCode}`);
    return null;
  }

  /**
   * Genera datos genéricos por país como último recurso
   * @param {string} countryCode - Código del país
   * @param {string} postalCode - Código postal
   * @param {string} countryName - Nombre del país
   * @returns {Object} Datos genéricos del país
   */
  getGenericCountryFallback(countryCode, postalCode, countryName) {
    console.log(`🌐 Generando fallback genérico para ${countryCode}: ${postalCode}`);
    
    // Datos genéricos por país basados en ciudades principales
    const genericCountryData = {
      MX: { area_level1: "México", area_level2: "Ciudad", area_level3: "Centro" },
      US: { area_level1: "State", area_level2: "City", area_level3: "Downtown" },
      CA: { area_level1: "Province", area_level2: "City", area_level3: "Downtown" },
      GB: { area_level1: "England", area_level2: "City", area_level3: "Centre" },
      FR: { area_level1: "Région", area_level2: "Ville", area_level3: "Centre" },
      DE: { area_level1: "Land", area_level2: "Stadt", area_level3: "Zentrum" },
      ES: { area_level1: "Comunidad", area_level2: "Ciudad", area_level3: "Centro" },
      IT: { area_level1: "Regione", area_level2: "Città", area_level3: "Centro" },
      BR: { area_level1: "Estado", area_level2: "Cidade", area_level3: "Centro" },
      AR: { area_level1: "Provincia", area_level2: "Ciudad", area_level3: "Centro" },
      CO: { area_level1: "Departamento", area_level2: "Ciudad", area_level3: "Centro" },
      CL: { area_level1: "Región", area_level2: "Ciudad", area_level3: "Centro" },
      AU: { area_level1: "State", area_level2: "City", area_level3: "CBD" },
      IN: { area_level1: "State", area_level2: "City", area_level3: "Central" },
      CN: { area_level1: "Province", area_level2: "City", area_level3: "Central" },
      JP: { area_level1: "Prefecture", area_level2: "City", area_level3: "Central" }
    };
    
    const genericData = genericCountryData[countryCode] || {
      area_level1: "Region",
      area_level2: "City", 
      area_level3: "Central"
    };
    
    const fallbackData = {
      country_code: countryCode,
      country_name: countryName,
      postal_code: postalCode,
      ...genericData,
      latitude: null,
      longitude: null,
      isGeneric: true // Marcar como genérico para logging
    };
    
    console.log(`⚠️  Usando datos genéricos para ${countryName} (${countryCode})`);
    return fallbackData;
  }

  /**
   * Obtiene información de dirección internacional desde código postal
   * Sistema de múltiples niveles con soporte internacional:
   * 1. Detección automática del país
   * 2. Base de datos local (solo México)
   * 3. API Zippopotam internacional
   * 4. APIs específicas por país
   * 5. Fallback manual por país
   * 6. Fallback genérico
   * 
   * @param {string} postalCode - Código postal a buscar
   * @param {string} forceCountry - Código de país opcional para forzar búsqueda
   * @returns {Promise<Object>} Información de la dirección
   */
  async getAddressFromPostalCodeInternational(postalCode, forceCountry = null) {
    try {
      console.log(`🌍 ======== BÚSQUEDA INTERNACIONAL ========`);
      console.log(`🔍 Código postal: ${postalCode}`);
      console.log(`🏳️  País forzado: ${forceCountry || 'Auto-detección'}`);
      console.log('===============================================');
      
      // Detectar país automáticamente o usar el forzado
      const countryInfo = forceCountry 
        ? { countryCode: forceCountry.toUpperCase(), countryName: 'Forzado', cleanPostalCode: postalCode.toString().trim() }
        : this.detectCountryFromPostalCode(postalCode);
      
      console.log(`🏳️  País detectado: ${countryInfo.countryName} (${countryInfo.countryCode})`);
      console.log(`📍 CP limpio: ${countryInfo.cleanPostalCode}`);
      
      // Verificar cache primero
      const cacheKey = `${countryInfo.countryCode}-${countryInfo.cleanPostalCode}`;
      if (this.postalCodeCache.has(cacheKey)) {
        console.log('💾 CP encontrado en cache internacional');
        const cachedData = this.postalCodeCache.get(cacheKey);
        console.log('📍 Datos desde cache:', JSON.stringify(cachedData, null, 2));
        console.log('===============================================');
        return cachedData;
      }
      
      // PASO 1: Base de datos local (solo para México)
      if (countryInfo.countryCode === 'MX') {
        console.log('📂 Paso 1: Buscando en base de datos local mexicana...');
        await this.loadPostalCodeData();
        
        if (this.postalCodeCache.has(countryInfo.cleanPostalCode)) {
          console.log('✅ CP encontrado en base de datos local mexicana');
          const localData = this.postalCodeCache.get(countryInfo.cleanPostalCode);
          console.log('📍 Dirección desde base local:', JSON.stringify(localData, null, 2));
          
          // Guardar en cache internacional
          this.postalCodeCache.set(cacheKey, localData);
          console.log('===============================================');
          return localData;
        }
        console.log('❌ CP no encontrado en base de datos local mexicana');
      } else {
        console.log(`⏭️  Paso 1: Saltando base local (país: ${countryInfo.countryCode})`);
      }
      
      // PASO 2: API Zippopotam internacional
      console.log('🌐 Paso 2: Consultando API Zippopotam internacional...');
      
      try {
        const zippopotamUrl = `http://api.zippopotam.us/${countryInfo.countryCode.toLowerCase()}/${countryInfo.cleanPostalCode}`;
        console.log('🔗 URL Zippopotam internacional:', zippopotamUrl);
        
        const response = await fetch(zippopotamUrl);
        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🌍 Respuesta de Zippopotam internacional:', JSON.stringify(data, null, 2));
          
          if (data && data.places && data.places[0]) {
            const place = data.places[0];
            
            // Mapear datos internacionales al formato estándar
            const addressData = {
              country_code: countryInfo.countryCode,
              country_name: data.country || countryInfo.countryName,
              postal_code: countryInfo.cleanPostalCode,
              area_level1: place.state || place['state abbreviation'] || "",
              area_level2: place['place name'] || "",
              area_level3: place['place name'] || "",
              latitude: parseFloat(place.latitude) || null,
              longitude: parseFloat(place.longitude) || null
            };
            
            console.log('✅ CP encontrado en Zippopotam internacional');
            console.log(`📍 País: ${addressData.country_name}`);
            console.log(`📍 Estado/Región: ${addressData.area_level1}`);
            console.log(`📍 Ciudad: ${addressData.area_level2}`);
            
            // Guardar en cache internacional
            this.postalCodeCache.set(cacheKey, addressData);
            console.log('💾 CP guardado en cache internacional');
            console.log('===============================================');
            
            return addressData;
          }
        }
        console.log(`❌ Zippopotam internacional: No se encontraron datos`);
      } catch (zippopotamError) {
        console.log('❌ Error consultando Zippopotam internacional:', zippopotamError.message);
      }
      
      // PASO 3: APIs específicas por país
      console.log('🔧 Paso 3: Intentando APIs específicas por país...');
      
      const countrySpecificData = await this.getCountrySpecificPostalData(countryInfo.countryCode, countryInfo.cleanPostalCode);
      if (countrySpecificData) {
        console.log('✅ CP encontrado en API específica del país');
        console.log('📍 Datos de API específica:', JSON.stringify(countrySpecificData, null, 2));
        
        // Guardar en cache internacional
        this.postalCodeCache.set(cacheKey, countrySpecificData);
        console.log('💾 CP guardado en cache desde API específica');
        console.log('===============================================');
        
        return countrySpecificData;
      }
      
      // PASO 4: Fallback manual internacional
      console.log('🗺️  Paso 4: Usando fallback manual internacional...');
      
      const manualData = this.getInternationalManualFallback(countryInfo.countryCode, countryInfo.cleanPostalCode);
      if (manualData) {
        console.log('✅ CP encontrado en fallback manual internacional');
        console.log('📍 Datos de fallback manual:', JSON.stringify(manualData, null, 2));
        
        // Guardar en cache internacional
        this.postalCodeCache.set(cacheKey, manualData);
        console.log('💾 CP guardado en cache desde fallback manual');
        console.log('===============================================');
        
        return manualData;
      }
      
      // PASO 5: Fallback genérico por país
      console.log('🌐 Paso 5: Usando fallback genérico por país...');
      
      const genericData = this.getGenericCountryFallback(countryInfo.countryCode, countryInfo.cleanPostalCode, countryInfo.countryName);
      console.log('📍 Usando datos genéricos del país:', JSON.stringify(genericData, null, 2));
      
      // Guardar en cache internacional
      this.postalCodeCache.set(cacheKey, genericData);
      console.log('💾 CP guardado en cache desde fallback genérico');
      console.log('⚠️  ADVERTENCIA: Datos genéricos - puede afectar precisión');
      console.log('===============================================');
      
      return genericData;
      
    } catch (error) {
      console.error('❌ ERROR CRÍTICO en búsqueda internacional:', error.message);
      console.error('🔍 Stack trace:', error.stack);
      
      // Fallback de emergencia
      const emergencyData = {
        country_code: "MX", // Default a México
        country_name: "México",
        postal_code: postalCode,
        area_level1: "México",
        area_level2: "Ciudad",
        area_level3: "Centro",
        latitude: null,
        longitude: null,
        isEmergency: true
      };
      
      console.log('🆘 Usando fallback de emergencia:', JSON.stringify(emergencyData, null, 2));
      console.log('===============================================');
      
      return emergencyData;
    }
  }

  /**
   * Solicita cotización de envío a SkyDropX con soporte internacional
   * @param {string} cartId - ID del carrito
   * @param {string} postalCodeTo - Código postal destino
   * @param {string} forceCountry - Código de país opcional para forzar búsqueda
   * @returns {Promise<Object>} Cotizaciones de envío
   */
  async getShippingQuoteInternational(cartId, postalCodeTo, forceCountry = null) {
    let quotationPayload = null; // Declarar variable al inicio para que esté disponible en catch
    
    try {
      console.log('🌍 =========================');
      console.log('💰 INICIANDO COTIZACIÓN INTERNACIONAL');
      console.log('🚀 =========================');
      console.log('📦 Cart ID:', cartId);
      console.log('📍 Código postal destino:', postalCodeTo);
      console.log('🏳️  País forzado:', forceCountry || 'Auto-detección');
      console.log('⏰ Timestamp:', new Date().toISOString());

      // Detectar país del código postal
      const countryInfo = forceCountry 
        ? { countryCode: forceCountry.toUpperCase(), countryName: 'Forzado', cleanPostalCode: postalCodeTo.toString().trim() }
        : this.detectCountryFromPostalCode(postalCodeTo);
      
      console.log(`🌍 País detectado: ${countryInfo.countryName} (${countryInfo.countryCode})`);

      // Obtener token de autenticación
      console.log('🔑 Paso 1: Obteniendo token de autenticación...');
      const token = await this.skyDropXAuth.getBearerToken();
      console.log('✅ Token obtenido exitosamente');
      
      // Obtener datos del carrito
      console.log('🛒 Paso 2: Obteniendo datos del carrito...');
      const cartData = await this.getCartShippingData(cartId);
      console.log('📊 DATOS DEL CARRITO OBTENIDOS:');
      console.log('   Items:', cartData.cartItems.length);
      console.log('   Peso total:', cartData.totalWeight, 'kg');
      console.log('   Dimensiones:', JSON.stringify(cartData.dimensions));
      console.log('   Factor compresión:', cartData.compressionFactor);
      
      // Obtener datos de dirección destino usando sistema internacional
      console.log('🗺️  Paso 3: Obteniendo dirección destino internacional...');
      const addressTo = await this.getAddressFromPostalCodeInternational(postalCodeTo, forceCountry);
      console.log('📍 DIRECCIÓN DESTINO INTERNACIONAL:');
      console.log('   País:', addressTo.country_name, `(${addressTo.country_code})`);
      console.log('   Estado/Región:', addressTo.area_level1);
      console.log('   Ciudad/Municipio:', addressTo.area_level2);
      console.log('   Área/Colonia:', addressTo.area_level3);
      console.log('   CP:', addressTo.postal_code);
      
      if (addressTo.latitude && addressTo.longitude) {
        console.log('   Coordenadas:', `${addressTo.latitude}, ${addressTo.longitude}`);
      }
      
      if (addressTo.isGeneric) {
        console.log('⚠️  ADVERTENCIA: Dirección genérica - puede afectar precisión');
      }

      // Preparar productos para la API internacional con códigos HS reales
      console.log('📦 Paso 3.5: Preparando productos con códigos HS de categorías...');
      const productsForParcel = cartData.cartItems.map((item, index) => {
        const unitPrice = parseFloat(item.precio) || 10.0;
        const hsCode = item.categoria_hs_code || '6109.90.00'; // Fallback genérico
        
        // Generar descripción en inglés basada en la categoría
        let descriptionEn = `${item.categoria_nombre} - ${item.variante_nombre}`;
        
        // Traducir categorías comunes al inglés
        const categoryTranslations = {
          'playeras': 'T-shirt',
          'camisetas': 'T-shirt', 
          'sueteres': 'Sweater',
          'hoodies': 'Hoodie',
          'sudaderas': 'Sweatshirt',
          'pantalones': 'Pants',
          'jeans': 'Jeans',
          'shorts': 'Shorts',
          'faldas': 'Skirt',
          'vestidos': 'Dress',
          'gorras': 'Cap',
          'sombreros': 'Hat',
          'zapatos': 'Shoes',
          'tenis': 'Sneakers',
          'sandalias': 'Sandals',
          'bolsas': 'Bag',
          'mochilas': 'Backpack',
          'carteras': 'Purse'
        };
        
        const categoryKey = item.categoria_nombre.toLowerCase();
        const translatedCategory = categoryTranslations[categoryKey] || 'Cotton clothing';
        descriptionEn = `${translatedCategory} - ${item.variante_nombre}`;
        
        // Asegurar mínimo 15 caracteres
        if (descriptionEn.length < 15) {
          descriptionEn = `Cotton ${translatedCategory} from Mexico`;
        }
        
        console.log(`   📦 Producto ${index + 1}: ${item.producto_nombre}`);
        console.log(`     🏛️  HS Code: ${hsCode} (Categoría: ${item.categoria_nombre})`);
        console.log(`     🌍 Descripción EN: ${descriptionEn}`);
        console.log(`     💰 Precio: $${unitPrice} x ${item.cantidad}`);
        
        return {
          hs_code: hsCode,
          description_en: descriptionEn.substring(0, 100), // Máximo 100 caracteres
          country_code: "MX", // País de origen (México)
          quantity: parseInt(item.cantidad) || 1,
          price: parseFloat(unitPrice.toFixed(2))
        };
      });

      console.log(`📋 ${productsForParcel.length} productos preparados con códigos HS reales`);

      // Preparar payload para SkyDropX
      quotationPayload = {
        quotation: {
          order_id: `cart_${cartId}_${Date.now()}`,
          address_from: this.addressFrom,
          address_to: addressTo,
          parcels: [
            {
              length: Math.ceil(cartData.dimensions.length),
              width: Math.ceil(cartData.dimensions.width),
              height: Math.ceil(cartData.dimensions.height),
              weight: Math.ceil(cartData.totalWeight),
              products: productsForParcel // Productos con códigos HS reales
            }
          ],
          shipment_type: "package",
          quote_type: "carrier"
        }
      };

      console.log('📤 Paso 4: Preparando solicitud internacional a SkyDropX...');
      console.log('🔗 URL:', `${this.baseUrl}/quotations`);
      console.log('📋 Dirección destino procesada:', JSON.stringify(addressTo, null, 2));
      
      // ==========================================
      // 🔍 LOG DETALLADO DE LA ESTRUCTURA JSON
      // ==========================================
      console.log('🔍 ==========================================');
      console.log('🔍 ESTRUCTURA COMPLETA DEL JSON A ENVIAR:');
      console.log('🔍 ==========================================');
      console.log('📦 PAYLOAD COMPLETO:', JSON.stringify(quotationPayload, null, 2));
      console.log('');
      console.log('🔧 ANÁLISIS DETALLADO DE COMPONENTES:');
      console.log('-------------------------------------');
      console.log('📋 ORDER ID:', quotationPayload.quotation.order_id);
      console.log('📍 ADDRESS FROM:', JSON.stringify(quotationPayload.quotation.address_from, null, 2));
      console.log('📍 ADDRESS TO:', JSON.stringify(quotationPayload.quotation.address_to, null, 2));
      console.log('📦 PARCELS:', JSON.stringify(quotationPayload.quotation.parcels, null, 2));
      console.log('🚚 SHIPMENT TYPE:', quotationPayload.quotation.shipment_type);
      console.log('💰 QUOTE TYPE:', quotationPayload.quotation.quote_type);
      console.log('');
      console.log('📊 DATOS DEL CARRITO USADOS:');
      console.log('-------------------------------------');
      console.log('   Items en carrito:', cartData.cartItems.length);
      console.log('   Peso total calculado:', cartData.totalWeight, 'kg');
      console.log('   Valor total del carrito:', cartData.totalValue || 'NO DISPONIBLE');
      console.log('   Dimensiones calculadas:', JSON.stringify(cartData.dimensions, null, 2));
      console.log('   Factor de compresión:', cartData.compressionFactor);
      console.log('');
      console.log('🔍 HEADERS DE LA PETICIÓN:');
      console.log('-------------------------------------');
      console.log('   Content-Type: application/json');
      console.log('   Authorization: Bearer [TOKEN_PRESENTE]');
      console.log('🔍 ==========================================');
      console.log('📤 Enviando solicitud...');

      // Hacer petición a SkyDropX
      const response = await axios.post(
        `${this.baseUrl}/quotations`,
        quotationPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('📥 Respuesta de SkyDropX recibida');
      console.log('🔍 STATUS RESPONSE:', response.status);
      
      // ==========================================
      // 🔍 LOG DETALLADO DE LA RESPUESTA JSON (INTERNACIONAL)
      // ==========================================
      console.log('🔍 ==========================================');
      console.log('🔍 RESPUESTA COMPLETA DE SKYDROPX (INTERNACIONAL):');
      console.log('🔍 ==========================================');
      console.log('📥 RESPONSE DATA COMPLETA:', JSON.stringify(response.data, null, 2));
      console.log('');
      console.log('🔧 ANÁLISIS DE LA RESPUESTA:');
      console.log('-------------------------------------');
      console.log('📊 Status HTTP:', response.status);
      console.log('📋 Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('📦 Response Size:', JSON.stringify(response.data).length, 'caracteres');
      console.log('🌍 País destino:', addressTo.country_name, '(' + addressTo.country_code + ')');
      console.log('🔍 ==========================================');
      
      // Log específico de cotizaciones exitosas
      if (response.data && response.data.rates) {
        const successfulRates = response.data.rates.filter(rate => rate.success === true);
        const failedRates = response.data.rates.filter(rate => rate.success === false);
        
        console.log(`📊 RESUMEN DE COTIZACIONES INTERNACIONAL:`);
        console.log(`   País destino: ${addressTo.country_name} (${addressTo.country_code})`);
        console.log(`   Total de rates: ${response.data.rates.length}`);
        console.log(`   Exitosas: ${successfulRates.length}`);
        console.log(`   Fallidas: ${failedRates.length}`);
        
        if (successfulRates.length > 0) {
          console.log('✅ COTIZACIONES EXITOSAS:');
          successfulRates.forEach((rate, index) => {
            console.log(`   ${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}: $${rate.total} ${rate.currency_code} (${rate.days} días)`);
          });
        }
        
        if (failedRates.length > 0) {
          console.log('❌ COTIZACIONES FALLIDAS (primeras 3):');
          failedRates.slice(0, 3).forEach((rate, index) => {
            const errorMsg = rate.error_messages && rate.error_messages.length > 0 
              ? rate.error_messages[0].error_message 
              : 'Sin mensaje de error';
            console.log(`   ${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}: ${errorMsg}`);
          });
        }
      }

      console.log('🎉 COTIZACIÓN INTERNACIONAL COMPLETADA EXITOSAMENTE');
      
      return {
        success: true,
        isInternational: true,
        countryInfo: countryInfo,
        addressInfo: {
          detected: addressTo,
          isGeneric: addressTo.isGeneric || false,
          hasCoordinates: !!(addressTo.latitude && addressTo.longitude)
        },
        cartData: {
          items: cartData.cartItems.length,
          totalWeight: cartData.totalWeight,
          dimensions: cartData.dimensions,
          compressionFactor: cartData.compressionFactor
        },
        quotations: response.data,
        requestPayload: quotationPayload
      };

    } catch (error) {
      console.error('❌ Error obteniendo cotización internacional:', error.message);
      
      // Log detallado del error
      if (error.response) {
        console.error('📋 DETALLES DEL ERROR INTERNACIONAL:');
        console.error('🔍 STATUS ERROR:', error.response.status);
        console.error('🔍 STATUS TEXT:', error.response.statusText);
        console.error('🔍 DATA ERROR:', JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        isInternational: true,
        error: error.message,
        details: error.response?.data || 'No additional details available',
        requestPayload: quotationPayload || null
      };
    }
  }

  async getShippingQuote(cartId, postalCodeTo) {
    let quotationPayload = null; // Declarar variable al inicio para que esté disponible en catch
    
    try {
      console.log('� =========================');
      console.log('💰 INICIANDO COTIZACIÓN DE ENVÍO');
      console.log('🚀 =========================');
      console.log('📦 Cart ID:', cartId);
      console.log('📍 Código postal destino:', postalCodeTo);
      console.log('⏰ Timestamp:', new Date().toISOString());

      // Obtener token de autenticación
      console.log('🔑 Paso 1: Obteniendo token de autenticación...');
      const token = await this.skyDropXAuth.getBearerToken();
      console.log('✅ Token obtenido exitosamente');
      
      // Obtener datos del carrito
      console.log('🛒 Paso 2: Obteniendo datos del carrito...');
      const cartData = await this.getCartShippingData(cartId);
      console.log('📊 DATOS DEL CARRITO OBTENIDOS:');
      console.log('   Items:', cartData.cartItems.length);
      console.log('   Peso total:', cartData.totalWeight, 'kg');
      console.log('   Dimensiones:', JSON.stringify(cartData.dimensions));
      console.log('   Factor compresión:', cartData.compressionFactor);
      
      // Obtener datos de dirección destino
      console.log('🗺️  Paso 3: Obteniendo dirección destino...');
      const addressTo = await this.getAddressFromPostalCode(postalCodeTo);
      console.log('📍 DIRECCIÓN DESTINO:');
      console.log('   Estado:', addressTo.area_level1);
      console.log('   Municipio:', addressTo.area_level2);
      console.log('   Colonia:', addressTo.area_level3);
      console.log('   CP:', addressTo.postal_code);

      // Preparar payload para SkyDropX
      quotationPayload = {
        quotation: {
          order_id: `cart_${cartId}_${Date.now()}`,
          address_from: this.addressFrom,
          address_to: addressTo,
          parcels: [
            {
              length: Math.ceil(cartData.dimensions.length),
              width: Math.ceil(cartData.dimensions.width),
              height: Math.ceil(cartData.dimensions.height),
              weight: Math.ceil(cartData.totalWeight),
              declared_value: Math.ceil(cartData.totalValue), // Usar valor real del carrito
              description: "Cotton clothing items" // Descripción genérica para clasificación
            }
          ],
          // No especificar requested_carriers inicialmente para obtener todas las opciones
          shipment_type: "package", // Tipo de envío
          quote_type: "carrier" // Tipo de cotización
        }
      };

      console.log('📤 Paso 4: Preparando solicitud a SkyDropX...');
      console.log('🔗 URL:', `${this.baseUrl}/quotations`);
      
      // ==========================================
      // 🔍 LOG DETALLADO DE LA ESTRUCTURA JSON (NACIONAL)
      // ==========================================
      console.log('� ==========================================');
      console.log('🔍 ESTRUCTURA COMPLETA DEL JSON A ENVIAR (NACIONAL):');
      console.log('🔍 ==========================================');
      console.log('📦 PAYLOAD COMPLETO:', JSON.stringify(quotationPayload, null, 2));
      console.log('');
      console.log('🔧 ANÁLISIS DETALLADO DE COMPONENTES:');
      console.log('-------------------------------------');
      console.log('📋 ORDER ID:', quotationPayload.quotation.order_id);
      console.log('📍 ADDRESS FROM:', JSON.stringify(quotationPayload.quotation.address_from, null, 2));
      console.log('📍 ADDRESS TO:', JSON.stringify(quotationPayload.quotation.address_to, null, 2));
      console.log('� PARCELS:', JSON.stringify(quotationPayload.quotation.parcels, null, 2));
      console.log('🚚 SHIPMENT TYPE:', quotationPayload.quotation.shipment_type);
      console.log('💰 QUOTE TYPE:', quotationPayload.quotation.quote_type);
      console.log('');
      console.log('📊 DATOS DEL CARRITO USADOS:');
      console.log('-------------------------------------');
      console.log('   Items en carrito:', cartData.cartItems.length);
      console.log('   Peso total calculado:', cartData.totalWeight, 'kg');
      console.log('   Valor total del carrito:', cartData.totalValue || 'NO DISPONIBLE');
      console.log('   Dimensiones calculadas:', JSON.stringify(cartData.dimensions, null, 2));
      console.log('   Factor de compresión:', cartData.compressionFactor);
      console.log('');
      console.log('🔍 HEADERS DE LA PETICIÓN:');
      console.log('-------------------------------------');
      console.log('   Content-Type: application/json');
      console.log('   Authorization: Bearer [TOKEN_PRESENTE]');
      console.log('🔍 ==========================================');
      console.log('📤 Enviando solicitud...');

      // Hacer petición a SkyDropX
      const response = await axios.post(
        `${this.baseUrl}/quotations`,
        quotationPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('📥 Respuesta de SkyDropX recibida');
      console.log('🔍 STATUS RESPONSE:', response.status);
      console.log('🔍 HEADERS RESPONSE:', JSON.stringify(response.headers, null, 2));
      
      // ==========================================
      // 🔍 LOG DETALLADO DE LA RESPUESTA JSON
      // ==========================================
      console.log('🔍 ==========================================');
      console.log('🔍 RESPUESTA COMPLETA DE SKYDROPX (NACIONAL):');
      console.log('🔍 ==========================================');
      console.log('📥 RESPONSE DATA COMPLETA:', JSON.stringify(response.data, null, 2));
      console.log('');
      console.log('🔧 ANÁLISIS DE LA RESPUESTA:');
      console.log('-------------------------------------');
      console.log('📊 Status HTTP:', response.status);
      console.log('📋 Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('📦 Response Size:', JSON.stringify(response.data).length, 'caracteres');
      console.log('🔍 ==========================================');
      
      // Log específico de cotizaciones exitosas
      if (response.data && response.data.rates) {
        const successfulRates = response.data.rates.filter(rate => rate.success === true);
        const failedRates = response.data.rates.filter(rate => rate.success === false);
        
        console.log(`📊 RESUMEN DE COTIZACIONES:`);
        console.log(`   Total de rates: ${response.data.rates.length}`);
        console.log(`   Exitosas: ${successfulRates.length}`);
        console.log(`   Fallidas: ${failedRates.length}`);
        
        if (successfulRates.length > 0) {
          console.log('✅ COTIZACIONES EXITOSAS:');
          successfulRates.forEach((rate, index) => {
            console.log(`   ${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}: $${rate.total} ${rate.currency_code} (${rate.days} días)`);
          });
        }
        
        if (failedRates.length > 0) {
          console.log('❌ COTIZACIONES FALLIDAS (primeras 3):');
          failedRates.slice(0, 3).forEach((rate, index) => {
            const errorMsg = rate.error_messages && rate.error_messages.length > 0 
              ? rate.error_messages[0].error_message 
              : 'Sin mensaje de error';
            console.log(`   ${index + 1}. ${rate.provider_display_name} - ${rate.provider_service_name}: ${errorMsg}`);
          });
        }
      }

      return {
        success: true,
        cartData: {
          items: cartData.cartItems.length,
          totalWeight: cartData.totalWeight,
          dimensions: cartData.dimensions,
          compressionFactor: cartData.compressionFactor
        },
        quotations: response.data,
        requestPayload: quotationPayload // Para debugging
      };
      
      console.log('🎉 COTIZACIÓN COMPLETADA EXITOSAMENTE');
      console.log('📊 Datos retornados al cliente:', JSON.stringify({
        success: true,
        totalQuotations: response.data.rates ? response.data.rates.length : 0,
        successfulQuotations: response.data.rates ? response.data.rates.filter(r => r.success).length : 0,
        cartItems: cartData.cartItems.length,
        totalWeight: cartData.totalWeight + ' kg'
      }, null, 2));
      console.log('🚀 =========================');
      
      return {
        success: true,
        cartData: {
          items: cartData.cartItems.length,
          totalWeight: cartData.totalWeight,
          dimensions: cartData.dimensions,
          compressionFactor: cartData.compressionFactor
        },
        quotations: response.data,
        requestPayload: quotationPayload // Para debugging
      };

    } catch (error) {
      console.error('❌ Error obteniendo cotización de envío:', error.message);
      
      // Log detallado del error con más información
      if (error.response) {
        console.error('📋 DETALLES DEL ERROR DE SKYDROPX:');
        console.error('🔍 STATUS ERROR:', error.response.status);
        console.error('🔍 STATUS TEXT:', error.response.statusText);
        console.error('🔍 HEADERS ERROR:', JSON.stringify(error.response.headers, null, 2));
        console.error('🔍 DATA ERROR COMPLETA:', JSON.stringify(error.response.data, null, 2));
        
        // Log específico para errores comunes
        if (error.response.status === 401) {
          console.error('🚨 ERROR DE AUTENTICACIÓN: Token inválido o expirado');
        } else if (error.response.status === 422) {
          console.error('🚨 ERROR DE VALIDACIÓN: Datos de la solicitud incorrectos');
        } else if (error.response.status === 429) {
          console.error('🚨 ERROR DE RATE LIMIT: Demasiadas solicitudes');
        } else if (error.response.status >= 500) {
          console.error('🚨 ERROR DEL SERVIDOR: Problema en SkyDropX');
        }
      } else if (error.request) {
        console.error('📋 ERROR DE RED/CONEXIÓN:');
        console.error('🔍 REQUEST CONFIG:', JSON.stringify(error.config, null, 2));
        console.error('🚨 No se recibió respuesta del servidor');
      } else {
        console.error('📋 ERROR DESCONOCIDO:');
        console.error('🔍 ERROR STACK:', error.stack);
      }
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'No additional details available',
        requestPayload: quotationPayload || null // Para debugging
      };
    }
  }

  /**
   * Busca un CP solo en la base de datos mexicana (sin fallbacks)
   * @param {string} postalCode - Código postal a buscar
   * @returns {Object} Resultado de la búsqueda
   */
  async searchInMexicanDatabase(postalCode) {
    console.log('🔍 BÚSQUEDA DIRECTA EN BASE MEXICANA:', postalCode);
    
    try {
      // Cargar base de datos si no está cargada
      if (!this.postalCodeDataLoaded || this.postalCodeCache.size === 0) {
        await this.loadPostalCodeData();
      }

      const cleanPostalCode = postalCode.trim();
      
      // Buscar en cache local
      if (this.postalCodeCache.has(cleanPostalCode)) {
        const cachedData = this.postalCodeCache.get(cleanPostalCode);
        console.log('✅ CP encontrado en cache mexicano');
        return {
          found: true,
          address: {
            country_code: 'MX',
            postal_code: cleanPostalCode,
            area_level1: cachedData.area_level1,
            area_level2: cachedData.area_level2,
            area_level3: cachedData.area_level3
          }
        };
      }

      console.log('❌ CP no encontrado en base mexicana');
      return { found: false, address: null };
      
    } catch (error) {
      console.error('❌ Error en búsqueda directa mexicana:', error.message);
      return { found: false, address: null };
    }
  }

  /**
   * Función híbrida que primero verifica CP en México, luego aplica internacional
   * @param {string} cartId - ID del carrito
   * @param {string} postalCodeTo - Código postal destino
   * @param {string} forceCountry - País forzado (opcional)
   * @returns {Object} Resultado de cotización
   */
  async getShippingQuoteHybrid(cartId, postalCodeTo, forceCountry = null) {
    console.log('🔄 =======================================');
    console.log('🌎 COTIZACIÓN HÍBRIDA (MÉXICO + INTERNACIONAL)');
    console.log('🔄 =======================================');
    console.log('📦 Cart ID:', cartId);
    console.log('📍 Código postal destino:', postalCodeTo);
    console.log('🏳️  País forzado:', forceCountry || 'Auto-detección');
    console.log('⏰ Timestamp:', new Date().toISOString());

    try {
      // PASO 1: Verificar si el CP existe en la base de datos mexicana
      console.log('\n🇲🇽 PASO 1: Verificando si CP existe en base mexicana...');
      
      let isMexicanCP = false;
      let mexicanAddress = null;
      
      try {
        // Intentar búsqueda directa en base mexicana (sin fallback genérico)
        const result = await this.searchInMexicanDatabase(postalCodeTo);
        if (result && result.found) {
          mexicanAddress = result.address;
          console.log('✅ CP encontrado en base mexicana:');
          console.log('   Estado:', mexicanAddress.area_level1);
          console.log('   Municipio:', mexicanAddress.area_level2);
          console.log('   Colonia:', mexicanAddress.area_level3);
          isMexicanCP = true;
        } else {
          console.log('❌ CP no encontrado en base mexicana');
          isMexicanCP = false;
        }
      } catch (error) {
        console.log('❌ Error verificando base mexicana:', error.message);
        isMexicanCP = false;
      }

      // PASO 2: Decidir qué función usar
      if (isMexicanCP && !forceCountry) {
        console.log('\n🇲🇽 DECISIÓN: Usar cotización nacional (México)');
        console.log('📞 Llamando a getShippingQuote()...');
        return await this.getShippingQuote(cartId, postalCodeTo);
      } else {
        console.log('\n🌍 DECISIÓN: Usar cotización internacional');
        if (forceCountry) {
          console.log('📋 Razón: País forzado =', forceCountry);
        } else {
          console.log('📋 Razón: CP no encontrado en base mexicana');
        }
        console.log('📞 Llamando a getShippingQuoteInternational()...');
        return await this.getShippingQuoteInternational(cartId, postalCodeTo, forceCountry);
      }

    } catch (error) {
      console.error('❌ ERROR EN COTIZACIÓN HÍBRIDA:');
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
      
      return {
        success: false,
        isHybrid: true,
        error: error.message,
        details: 'Error en función híbrida de cotización',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Formatea las cotizaciones para el frontend
   * @param {Object} quotationsResponse - Respuesta de SkyDropX
   * @returns {Array} Cotizaciones formateadas
   */
  formatQuotationsForFrontend(quotationsResponse) {
    console.log('🔄 Formateando cotizaciones para frontend...');
    console.log('📋 Input recibido:', JSON.stringify(quotationsResponse, null, 2));
    
    if (!quotationsResponse.success || !quotationsResponse.quotations) {
      console.log('❌ No hay cotizaciones exitosas para formatear');
      return [];
    }

    const quotations = quotationsResponse.quotations;
    
    // La respuesta de SkyDropX tiene rates, no data
    if (!quotations.rates || !Array.isArray(quotations.rates)) {
      console.log('❌ No se encontró array de rates en la respuesta');
      return [];
    }

    // Filtrar solo las cotizaciones exitosas
    const successfulRates = quotations.rates.filter(rate => rate.success === true);
    console.log(`📊 Rates exitosas encontradas: ${successfulRates.length} de ${quotations.rates.length} total`);

    if (successfulRates.length === 0) {
      console.log('❌ No hay rates exitosas para mostrar al frontend');
      return [];
    }

    // Formatear según la estructura real de SkyDropX
    const formattedQuotations = successfulRates.map(rate => {
      const formatted = {
        carrier: rate.provider_display_name,
        service: rate.provider_service_name,
        price: parseFloat(rate.total),
        currency: rate.currency_code,
        estimatedDays: rate.days,
        description: `${rate.provider_display_name} - ${rate.provider_service_name}`,
        // Datos adicionales útiles
        cost: rate.cost,
        zone: rate.zone,
        rateId: rate.id
      };
      
      console.log(`✅ Cotización formateada: ${formatted.carrier} - ${formatted.service}: $${formatted.price} ${formatted.currency} (${formatted.estimatedDays} días)`);
      
      return formatted;
    });

    console.log(`🎉 ${formattedQuotations.length} cotizaciones formateadas exitosamente`);
    return formattedQuotations;
  }
}

module.exports = ShippingQuoteService;
