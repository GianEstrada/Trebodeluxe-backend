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
      const filePath = path.join(__dirname, '../data/CPdescarga.txt');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
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
    } catch (error) {
      console.error('❌ [POSTAL] Error cargando datos:', error.message);
      this.postalData = new Map();
    }
  }

  // Obtener colonias por código postal
  getColoniasByCP(codigoPostal) {
    if (!codigoPostal || typeof codigoPostal !== 'string') {
      return { success: false, error: 'Código postal inválido' };
    }

    const cp = codigoPostal.trim();
    const data = this.postalData.get(cp);
    
    if (!data) {
      return { 
        success: false, 
        error: 'Código postal no encontrado',
        codigo_postal: cp
      };
    }

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
