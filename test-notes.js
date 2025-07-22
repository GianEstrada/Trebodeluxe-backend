const NotesController = require('./src/controllers/notes.controller.js');

async function testNotesAPI() {
  try {
    console.log('🧪 Probando API de Notas Generales...\n');
    
    // Crear un objeto de respuesta mock completo
    const createMockResponse = (description) => ({
      status: (code) => ({
        json: (data) => {
          console.log(`${description} - Status: ${code}`);
          if (data.success) {
            console.log('✅ Respuesta exitosa:', data.message || 'Operación completada');
            if (data.data) {
              console.log('📊 Datos:', JSON.stringify(data.data, null, 2));
            }
          } else {
            console.log('❌ Error:', data.message);
          }
          return data;
        }
      }),
      json: (data) => {
        if (data.success) {
          console.log(`✅ ${description} exitoso:`, data.message || 'Operación completada');
          if (data.data) {
            console.log('📊 Datos recibidos');
          }
        } else {
          console.log(`❌ Error en ${description}:`, data.message);
        }
        return data;
      }
    });
    
    // Crear una nota de prueba
    console.log('1. Creando nota de prueba...');
    const newNote = {
      titulo: 'Nota de prueba API',
      contenido: 'Esta es una nota de prueba para verificar el funcionamiento del sistema de notas generales',
      prioridad: 'alta',
      etiquetas: ['test', 'api', 'prueba'],
      color: 'blue',
      fecha_vencimiento: '2025-01-15'
    };
    
    const req1 = {
      body: newNote,
      user: { id: 1 } // Usuario administrador de prueba
    };
    
    await NotesController.createNote(req1, createMockResponse('Crear nota'));
    
    // Obtener todas las notas
    console.log('\n2. Obteniendo todas las notas...');
    const req2 = { query: {} };
    
    await NotesController.getAllNotes(req2, createMockResponse('Obtener notas'));
    
    // Obtener estadísticas
    console.log('\n3. Obteniendo estadísticas...');
    const req3 = {};
    
    await NotesController.getNotesStats(req3, createMockResponse('Estadísticas'));
    
    // Obtener etiquetas
    console.log('\n4. Obteniendo etiquetas...');
    const req4 = {};
    
    await NotesController.getAllTags(req4, createMockResponse('Etiquetas'));
    
    console.log('\n🎉 Todas las pruebas de la API de notas completadas correctamente!');
    process.exit(0);
    
  } catch(err) {
    console.error('❌ Error durante las pruebas:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testNotesAPI();
