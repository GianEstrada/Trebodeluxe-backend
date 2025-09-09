// src/services/postal-codes.service.js
const fs = require('fs');
const path = require('path');

class PostalCodesService {
  constructor() {
    this.postalData = null;
    this.loadPostalData();
  }

  // Cargar datos del archivo CP
  loadPostalData() {
    try {
      console.log('🔍 [POSTAL] Iniciando carga de datos...');
      const filePath = path.join(__dirname, '../Data/CPdescarga.txt');
      console.log('📁 [POSTAL] Ruta del archivo:', filePath);
      console.log('📋 [POSTAL] Verificando si existe el archivo...');
      
      if (!fs.existsSync(filePath)) {
        console.error('❌ [POSTAL] Archivo no encontrado:', filePath);
        this.postalData = new Map();
        return;
      }
      
      console.log('✅ [POSTAL] Archivo encontrado, leyendo contenido...');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      console.log('📊 [POSTAL] Tamaño del archivo:', fileContent.length, 'caracteres');
      
      // Parsear el archivo
      const lines = fileContent.split('\n');
      this.postalData = new Map();
      
      // Saltar las primeras líneas de header
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split('|');
        if (parts.length >= 6) {
          const codigoPostal = parts[0];
          const colonia = parts[1];
          const tipoAsentamiento = parts[2];
          const municipio = parts[3];
          const estado = parts[4];
          const ciudad = parts[5];
          
          if (!this.postalData.has(codigoPostal)) {
            this.postalData.set(codigoPostal, {
              estado,
              municipio,
              ciudad,
              colonias: []
            });
          }
          
          this.postalData.get(codigoPostal).colonias.push({
            nombre: colonia,
            tipo: tipoAsentamiento
          });
        }
      }
      
      console.log(`✅ [POSTAL] Datos cargados: ${this.postalData.size} códigos postales`);
      
      // Verificar específicamente el CP 66058 para debugging
      if (this.postalData.has('66058')) {
        const data66058 = this.postalData.get('66058');
        console.log(`🎯 [POSTAL] CP 66058 encontrado con ${data66058.colonias.length} colonias en ${data66058.municipio}, ${data66058.estado}`);
      } else {
        console.log('❌ [POSTAL] CP 66058 NO encontrado en los datos cargados');
      }
    } catch (error) {
      console.error('❌ [POSTAL] Error cargando datos:', error.message);
      console.error('❌ [POSTAL] Stack trace:', error.stack);
      this.postalData = new Map();
    }
  }

  // Obtener colonias por código postal
  getColoniasByCP(codigoPostal) {
    console.log(`🔍 [POSTAL] Buscando CP: "${codigoPostal}" (tipo: ${typeof codigoPostal})`);
    
    if (!codigoPostal || typeof codigoPostal !== 'string') {
      console.log('❌ [POSTAL] Código postal inválido');
      return { success: false, error: 'Código postal inválido' };
    }

    const cp = codigoPostal.trim();
    console.log(`🔍 [POSTAL] CP limpio: "${cp}"`);
    console.log(`🔍 [POSTAL] Total CPs disponibles: ${this.postalData?.size || 0}`);
    
    const data = this.postalData.get(cp);
    console.log(`🔍 [POSTAL] Resultado de búsqueda:`, data ? 'ENCONTRADO' : 'NO ENCONTRADO');
    
    if (!data) {
      console.log(`❌ [POSTAL] CP ${cp} no encontrado`);
      return { 
        success: false, 
        error: 'Código postal no encontrado',
        codigo_postal: cp
      };
    }

    console.log(`✅ [POSTAL] CP ${cp} encontrado con ${data.colonias.length} colonias`);
    return {
      success: true,
      codigo_postal: cp,
      estado: data.estado,
      municipio: data.municipio,
      ciudad: data.ciudad,
      colonias: data.colonias.map(col => ({
        nombre: col.nombre,
        tipo: col.tipo
      }))
    };
  }

  // Buscar información completa por CP
  getInfoByCP(codigoPostal) {
    const result = this.getColoniasByCP(codigoPostal);
    
    if (!result.success) {
      return result;
    }

    // Retornar también info de ubicación para auto-completar formularios
    return {
      ...result,
      ubicacion: {
        estado: result.estado,
        municipio: result.municipio,
        ciudad: result.ciudad
      }
    };
  }

  // Validar código postal
  isValidCP(codigoPostal) {
    return this.postalData.has(codigoPostal?.trim());
  }

  // Obtener estadísticas
  getStats() {
    const totalCPs = this.postalData.size;
    let totalColonias = 0;
    const estados = new Set();
    
    for (const [cp, data] of this.postalData) {
      totalColonias += data.colonias.length;
      estados.add(data.estado);
    }
    
    return {
      total_codigos_postales: totalCPs,
      total_colonias: totalColonias,
      total_estados: estados.size
    };
  }
}

// Crear instancia singleton
const postalCodesService = new PostalCodesService();

module.exports = postalCodesService;
