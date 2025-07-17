const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de la conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com/trebolux_db',
  ssl: {
    rejectUnauthorized: false // Necesario para conexiones SSL a servicios como Render
  }
});

// Función para verificar el estado de la conexión a la DB
const checkConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Conexión exitosa a la base de datos PostgreSQL:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('Error al conectar a la base de datos PostgreSQL:', err.message);
    return false;
  }
};

// Exportar la instancia del pool y funciones relacionadas
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  checkConnection,
  isConnected: () => isConnected
};
