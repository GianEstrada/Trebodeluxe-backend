// fix-database-connection.js
require('dotenv').config();
const { Pool } = require('pg');

async function fixDatabaseConnection() {
  console.log('🔧 Diagnosticando y reparando conexión a la base de datos...');
  
  let pool;
  
  try {
    console.log('📊 Variables de entorno:');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'No configurado');
    
    // Configurar pool con opciones de reconexión
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      // Configuraciones para manejar desconexiones
      max: 10, // máximo número de clientes en el pool
      idleTimeoutMillis: 30000, // tiempo antes de cerrar cliente inactivo
      connectionTimeoutMillis: 10000, // tiempo máximo para obtener conexión
      // Configuraciones de reintentos
      query_timeout: 10000,
      statement_timeout: 15000,
    };
    
    console.log('🔌 Creando nuevo pool de conexiones...');
    pool = new Pool(config);
    
    // Manejar eventos del pool
    pool.on('error', (err) => {
      console.error('💥 Error en el pool de conexiones:', err);
    });
    
    pool.on('connect', () => {
      console.log('✅ Nueva conexión establecida');
    });
    
    console.log('🔍 Probando conexión...');
    
    // Intentar múltiples conexiones de prueba
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📡 Intento ${attempt}/3...`);
        
        const client = await pool.connect();
        console.log('✅ Conexión exitosa');
        
        // Probar query simple
        const result = await client.query('SELECT NOW() as tiempo_actual, version() as version_db');
        console.log('🕐 Tiempo actual del servidor:', result.rows[0].tiempo_actual);
        console.log('📦 Versión de PostgreSQL:', result.rows[0].version_db.split(' ')[0]);
        
        // Probar query en tabla usuarios
        const userCount = await client.query('SELECT COUNT(*) as total FROM usuarios');
        console.log('👥 Total usuarios en la base:', userCount.rows[0].total);
        
        // Probar query en tabla pedidos
        const orderCount = await client.query('SELECT COUNT(*) as total FROM pedidos');
        console.log('📦 Total pedidos en la base:', orderCount.rows[0].total);
        
        client.release();
        console.log('✅ Todas las pruebas exitosas');
        break;
        
      } catch (error) {
        console.error(`❌ Intento ${attempt} falló:`, error.message);
        
        if (attempt === 3) {
          throw error;
        }
        
        // Esperar antes del siguiente intento
        console.log('⏳ Esperando 5 segundos antes del siguiente intento...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('🎉 Conexión a la base de datos restablecida exitosamente');
    
  } catch (error) {
    console.error('💥 Error crítico:', error);
    
    if (error.code === 'ENOTFOUND') {
      console.log('🌐 Error de DNS - verificar URL de conexión');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🚫 Conexión rechazada - el servidor puede estar hibernando');
    } else if (error.message.includes('terminated unexpectedly')) {
      console.log('⚡ Conexión terminada inesperadamente - reintentar en unos minutos');
    }
    
    console.log('\n💡 Soluciones sugeridas:');
    console.log('1. Esperar 2-3 minutos y volver a intentar');
    console.log('2. Verificar el dashboard de Render');
    console.log('3. Reiniciar el servicio de base de datos en Render');
    
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 Pool de conexiones cerrado');
    }
  }
}

// Ejecutar con reintentos automáticos
async function runWithRetries() {
  const maxRetries = 3;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fixDatabaseConnection();
      return; // Éxito, salir
    } catch (error) {
      if (i === maxRetries - 1) {
        console.log('\n💥 Todos los intentos fallaron. La base de datos no está accesible.');
        console.log('🔧 Posibles acciones:');
        console.log('- Verificar Render Dashboard');
        console.log('- Contactar soporte de Render');
        console.log('- Esperar a que el servicio se restablezca automáticamente');
      } else {
        console.log(`\n🔄 Reintentando en 10 segundos... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
}

runWithRetries();
