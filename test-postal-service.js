// test-postal-service.js
const postalCodesService = require('./src/services/postal-codes.service');

async function testPostalService() {
  console.log('🧪 Probando servicio de códigos postales...\n');
  
  // Test 1: Estadísticas generales
  console.log('📊 Estadísticas del sistema:');
  const stats = postalCodesService.getStats();
  console.log(stats);
  console.log('');
  
  // Test 2: Buscar colonias de un CP específico (66058)
  console.log('🔍 Buscando colonias para CP 66058:');
  const result66058 = postalCodesService.getColoniasByCP('66058');
  console.log('Success:', result66058.success);
  if (result66058.success) {
    console.log('Estado:', result66058.estado);
    console.log('Municipio:', result66058.municipio);
    console.log('Ciudad:', result66058.ciudad);
    console.log('Colonias encontradas:', result66058.colonias.length);
    result66058.colonias.slice(0, 5).forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.nombre} (${col.tipo})`);
    });
    if (result66058.colonias.length > 5) {
      console.log(`  ... y ${result66058.colonias.length - 5} más`);
    }
  }
  console.log('');
  
  // Test 3: Buscar un CP de CDMX
  console.log('🔍 Buscando colonias para CP 01000 (CDMX):');
  const result01000 = postalCodesService.getColoniasByCP('01000');
  console.log('Success:', result01000.success);
  if (result01000.success) {
    console.log('Estado:', result01000.estado);
    console.log('Municipio:', result01000.municipio);
    console.log('Colonias:', result01000.colonias.length);
    result01000.colonias.slice(0, 3).forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.nombre} (${col.tipo})`);
    });
  }
  console.log('');
  
  // Test 4: CP inválido
  console.log('❌ Probando CP inválido (99999):');
  const resultInvalid = postalCodesService.getColoniasByCP('99999');
  console.log('Success:', resultInvalid.success);
  console.log('Error:', resultInvalid.error);
  console.log('');
  
  // Test 5: Validación de CP
  console.log('✅ Validando códigos postales:');
  console.log('66058 válido:', postalCodesService.isValidCP('66058'));
  console.log('01000 válido:', postalCodesService.isValidCP('01000'));
  console.log('99999 válido:', postalCodesService.isValidCP('99999'));
}

testPostalService();
