const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Validar la URL de la base de datos o construirla a partir de variables individuales
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  // Intentar construir la URL a partir de variables individuales
  const { DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT } = process.env;
  
  if (DB_HOST && DB_USER && DB_PASS && DB_NAME && DB_PORT) {
    DATABASE_URL = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    console.log('DATABASE_URL construida a partir de variables individuales');
  } else {
    console.error('ERROR: DATABASE_URL no está definida y no se pueden construir desde variables individuales');
    console.error('Variables disponibles:', Object.keys(process.env));
    throw new Error('DATABASE_URL no está definida');
  }
}

console.log('Configurando pool de conexiones a la base de datos...');
console.log('URL de la base de datos:', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

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

// Exportar la instancia del pool y funciones relacionadas
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  checkConnection
};
