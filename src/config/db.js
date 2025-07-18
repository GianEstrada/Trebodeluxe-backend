const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Validar la URL de la base de datos
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

// Configuración de la conexión a la base de datos
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para conexiones SSL a servicios como Render
  },
  // Configuración de timeouts y reintentos
  connectionTimeoutMillis: 10000, // 10 segundos
  idleTimeoutMillis: 30000, // 30 segundos
  max: 20, // máximo número de clientes en el pool
  retryDelay: 3000 // 3 segundos entre reintentos
});

// Función para verificar el estado de la conexión a la DB
const checkConnection = async () => {
  let client;
  try {
    // Intentar obtener un cliente del pool
    console.log('Intentando obtener una conexión del pool...');
    client = await pool.connect();
    
    // Intentar ejecutar una consulta simple
    console.log('Conexión obtenida, verificando con una consulta simple...');
    const result = await client.query('SELECT version()');
    
    // Validar el resultado
    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('No se recibió respuesta válida de la base de datos');
    }

    console.log('Conexión exitosa a PostgreSQL:', result.rows[0].version);
    return {
      connected: true,
      version: result.rows[0].version,
      poolStatus: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    };
  } catch (err) {
    console.error('Error al conectar a la base de datos PostgreSQL:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
      position: err.position
    });
    return false;
  } finally {
    // Asegurarse de liberar el cliente si se obtuvo uno
    if (client) {
      try {
        await client.release();
      } catch (releaseError) {
        console.error('Error al liberar el cliente:', releaseError.message);
      }
    }
  }
};

// Exportar el pool y la función de verificación
module.exports = {
  pool,
  checkConnection
};

// Exportar la instancia del pool y funciones relacionadas
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  checkConnection,
  isConnected: () => isConnected
};
