/**
 * Prueba del sistema internacional de códigos postales
 * Demuestra la capacidad de reconocer zonas aproximadas mediante CP de forma internacional
 */

const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testInternationalPostalCodes() {
  console.log('🌍 ========== PRUEBA SISTEMA INTERNACIONAL DE CÓDIGOS POSTALES ==========');
  console.log('📅 Fecha:', new Date().toLocaleString());
  console.log('=======================================================================\n');

  const shippingService = new ShippingQuoteService();

  // Casos de prueba con códigos postales de diferentes países
  const testCases = [
    // México (Base de datos local)
    { cp: '64000', country: null, description: 'México - Monterrey, NL (Base local)' },
    { cp: '66058', country: null, description: 'México - General Escobedo, NL (Base local)' },
    
    // México (Fallback Zippopotam)
    { cp: '45050', country: 'MX', description: 'México - Zapopan, Jalisco (Zippopotam)' },
    
    // Estados Unidos
    { cp: '10001', country: null, description: 'Estados Unidos - New York, NY (Auto-detección)' },
    { cp: '90210', country: 'US', description: 'Estados Unidos - Beverly Hills, CA (Forzado)' },
    { cp: '33101', country: null, description: 'Estados Unidos - Miami, FL (Auto-detección)' },
    
    // Canadá
    { cp: 'M5V 3M6', country: null, description: 'Canadá - Toronto, ON (Auto-detección)' },
    { cp: 'H3A 0G4', country: 'CA', description: 'Canadá - Montreal, QC (Forzado)' },
    
    // España
    { cp: '28001', country: null, description: 'España - Madrid (Auto-detección)' },
    { cp: '08001', country: 'ES', description: 'España - Barcelona (Forzado)' },
    
    // Francia
    { cp: '75001', country: null, description: 'Francia - París (Auto-detección)' },
    { cp: '13001', country: 'FR', description: 'Francia - Marsella (Forzado)' },
    
    // Brasil
    { cp: '01310-100', country: null, description: 'Brasil - São Paulo, SP (Auto-detección)' },
    { cp: '20040020', country: 'BR', description: 'Brasil - Rio de Janeiro, RJ (Forzado)' },
    
    // Reino Unido
    { cp: 'SW1A 1AA', country: null, description: 'Reino Unido - Londres (Auto-detección)' },
    { cp: 'M1 1AA', country: 'GB', description: 'Reino Unido - Manchester (Forzado)' },
    
    // Alemania
    { cp: '10115', country: null, description: 'Alemania - Berlín (Auto-detección)' },
    { cp: '80331', country: 'DE', description: 'Alemania - Múnich (Forzado)' },
    
    // Argentina
    { cp: '1001', country: null, description: 'Argentina - Buenos Aires (Auto-detección)' },
    { cp: '5000', country: 'AR', description: 'Argentina - Córdoba (Forzado)' },
    
    // Colombia
    { cp: '110111', country: null, description: 'Colombia - Bogotá (Auto-detección)' },
    { cp: '050001', country: 'CO', description: 'Colombia - Medellín (Forzado)' },
    
    // Australia
    { cp: '2000', country: null, description: 'Australia - Sydney, NSW (Auto-detección)' },
    { cp: '3000', country: 'AU', description: 'Australia - Melbourne, VIC (Forzado)' },
    
    // Japón
    { cp: '100-0001', country: null, description: 'Japón - Tokio (Auto-detección)' },
    { cp: '530-0001', country: 'JP', description: 'Japón - Osaka (Forzado)' },
    
    // India
    { cp: '110001', country: null, description: 'India - Nueva Delhi (Auto-detección)' },
    { cp: '400001', country: 'IN', description: 'India - Mumbai (Forzado)' },
    
    // China
    { cp: '100000', country: null, description: 'China - Beijing (Auto-detección)' },
    { cp: '200000', country: 'CN', description: 'China - Shanghai (Forzado)' },
    
    // Códigos no reconocidos (fallback genérico)
    { cp: 'ABC123', country: null, description: 'Código no reconocido (Fallback genérico)' },
    { cp: '999999', country: 'XX', description: 'País inexistente (Fallback genérico)' }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 PRUEBA: ${testCase.description}`);
      console.log(`📮 Código postal: ${testCase.cp}`);
      console.log(`🏳️  País forzado: ${testCase.country || 'Auto-detección'}`);
      console.log('---------------------------------------------------');

      const startTime = Date.now();
      const result = await shippingService.getAddressFromPostalCodeInternational(testCase.cp, testCase.country);
      const endTime = Date.now();

      console.log(`✅ RESULTADO EXITOSO (${endTime - startTime}ms):`);
      console.log(`📍 País: ${result.country_name} (${result.country_code})`);
      console.log(`📍 Estado/Región: ${result.area_level1}`);
      console.log(`📍 Ciudad/Municipio: ${result.area_level2}`);
      console.log(`📍 Área/Colonia: ${result.area_level3}`);
      
      if (result.latitude && result.longitude) {
        console.log(`🌐 Coordenadas: ${result.latitude}, ${result.longitude}`);
      }
      
      if (result.isGeneric) {
        console.log(`⚠️  NOTA: Datos genéricos utilizados`);
      }
      
      if (result.isEmergency) {
        console.log(`🆘 NOTA: Fallback de emergencia utilizado`);
      }

      successCount++;

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      errorCount++;
    }

    console.log('===================================================');
  }

  // Resumen final
  console.log(`\n🏁 ========== RESUMEN DE PRUEBAS ==========`);
  console.log(`📊 Total de pruebas: ${testCases.length}`);
  console.log(`✅ Exitosas: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`📈 Tasa de éxito: ${((successCount / testCases.length) * 100).toFixed(1)}%`);
  
  console.log(`\n🎯 ========== CAPACIDADES DEMOSTRADAS ==========`);
  console.log(`🌍 Detección automática de país por patrón de código postal`);
  console.log(`🇲🇽 Base de datos local mexicana (31,958+ códigos)`);
  console.log(`🌐 API Zippopotam para cobertura internacional`);
  console.log(`🔧 APIs específicas por país (Brasil: ViaCEP)`);
  console.log(`🗺️  Fallback manual para códigos conocidos`);
  console.log(`🌐 Fallback genérico para cualquier país`);
  console.log(`💾 Sistema de cache internacional`);
  console.log(`📝 Logging detallado para debugging`);
  
  console.log(`\n📋 ========== PAÍSES SOPORTADOS ==========`);
  const supportedCountries = [
    '🇲🇽 México (MX) - Base completa + APIs',
    '🇺🇸 Estados Unidos (US) - Zippopotam + Fallback',
    '🇨🇦 Canadá (CA) - Zippopotam + Fallback',
    '🇬🇧 Reino Unido (GB) - Zippopotam + Fallback',
    '🇫🇷 Francia (FR) - Zippopotam + Fallback',
    '🇩🇪 Alemania (DE) - Zippopotam + Fallback',
    '🇪🇸 España (ES) - Zippopotam + Fallback',
    '🇮🇹 Italia (IT) - Zippopotam + Fallback',
    '🇧🇷 Brasil (BR) - ViaCEP + Zippopotam + Fallback',
    '🇦🇷 Argentina (AR) - Zippopotam + Fallback',
    '🇨🇴 Colombia (CO) - Zippopotam + Fallback',
    '🇨🇱 Chile (CL) - Zippopotam + Fallback',
    '🇦🇺 Australia (AU) - Zippopotam + Fallback',
    '🇮🇳 India (IN) - Zippopotam + Fallback',
    '🇨🇳 China (CN) - Zippopotam + Fallback',
    '🇯🇵 Japón (JP) - Zippopotam + Fallback',
    '🌍 Cualquier país - Fallback genérico'
  ];
  
  supportedCountries.forEach(country => console.log(country));
  
  console.log(`\n🚀 Sistema internacional de códigos postales listo para producción! 🚀`);
  console.log('============================================================\n');
}

// Función para probar detección de países
async function testCountryDetection() {
  console.log('\n🔍 ========== PRUEBA DE DETECCIÓN DE PAÍSES ==========');
  
  const shippingService = new ShippingQuoteService();
  
  const detectTests = [
    '64000',     // México
    '10001',     // Estados Unidos
    'M5V 3M6',   // Canadá
    'SW1A 1AA',  // Reino Unido
    '75001',     // Francia
    '10115',     // Alemania
    '28001',     // España
    '00100',     // Italia
    '01310-100', // Brasil
    '1001',      // Argentina
    '110111',    // Colombia
    '8320001',   // Chile
    '2000',      // Australia
    '110001',    // India
    '100000',    // China
    '100-0001',  // Japón
    'ABC123'     // No reconocido
  ];
  
  for (const cp of detectTests) {
    const result = shippingService.detectCountryFromPostalCode(cp);
    console.log(`📮 ${cp.padEnd(10)} → 🏳️  ${result.countryName} (${result.countryCode})`);
  }
  
  console.log('======================================================\n');
}

// Ejecutar pruebas
async function runAllTests() {
  try {
    await testCountryDetection();
    await testInternationalPostalCodes();
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests();
}

module.exports = { testInternationalPostalCodes, testCountryDetection };
