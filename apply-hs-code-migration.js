const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

async function runHSCodeMigration() {
  console.log('🗄️ =======================================');
  console.log('🗄️ APLICANDO MIGRACIÓN: CÓDIGOS HS');
  console.log('🗄️ =======================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  // Usar la DATABASE_URL del archivo .env
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida en el archivo .env');
    process.exit(1);
  }

  console.log('🔗 Conectando a base de datos...');
  console.log('🔗 Host:', DATABASE_URL.split('@')[1]?.split('/')[0] || 'No detectado');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, 'migrations', 'add_hs_code_to_categorias.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Ejecutando migración...');
    console.log('------------------------------');

    // Dividir por comandos (separados por ;)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.toLowerCase().startsWith('--') || command.length === 0) {
        continue; // Saltar comentarios
      }

      try {
        console.log(`📝 Ejecutando comando ${i + 1}/${commands.length}...`);
        console.log(`   ${command.substring(0, 60)}${command.length > 60 ? '...' : ''}`);
        
        const result = await client.query(command);
        
        if (result.rows && result.rows.length > 0) {
          console.log(`   ✅ Ejecutado exitosamente (${result.rows.length} filas afectadas)`);
          
          // Si es la consulta de verificación, mostrar resultados
          if (command.toLowerCase().includes('select id_categoria')) {
            console.log('   📋 Categorías actualizadas:');
            result.rows.forEach(row => {
              console.log(`     ${row.id_categoria}: ${row.nombre} → ${row.hs_code || 'Sin código'}`);
            });
          }
        } else {
          console.log('   ✅ Ejecutado exitosamente');
        }
      } catch (cmdError) {
        console.error(`   ❌ Error en comando: ${cmdError.message}`);
        
        // Si es error de columna ya existente, continuar
        if (cmdError.message.includes('already exists')) {
          console.log('   ⚠️  Columna ya existe, continuando...');
          continue;
        }
        
        throw cmdError;
      }
    }

    console.log('');
    console.log('🎉 ===== MIGRACIÓN COMPLETADA =====');
    console.log('✅ Columna hs_code agregada a tabla categorias');
    console.log('✅ Códigos HS por defecto aplicados');
    console.log('✅ Índice creado para performance');
    console.log('✅ Verificación de datos completada');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('🔍 Stack:', error.stack);
    
    // Mostrar sugerencias de resolución
    console.log('');
    console.log('💡 SUGERENCIAS:');
    console.log('- Verificar que la base de datos esté accesible');
    console.log('- Confirmar que el usuario tenga permisos de ALTER TABLE');
    console.log('- Revisar si la columna hs_code ya existe');
    
  } finally {
    await client.end();
    console.log('🔌 Conexión a base de datos cerrada');
  }

  console.log('');
  console.log('🗄️ =======================================');
  console.log('🗄️ MIGRACIÓN HS CODE FINALIZADA');
  console.log('🗄️ =======================================');
}

// Ejecutar migración
runHSCodeMigration();
