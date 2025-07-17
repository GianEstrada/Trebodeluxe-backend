const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Configuración de la conexión a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false // Necesario para conexiones SSL a servicios como Render
  }
});

// Verificar la conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar a la base de datos PostgreSQL:', err);
  } else {
    console.log('Conexión exitosa a la base de datos PostgreSQL');
    release();
  }
});

// Exportar la instancia del pool para ser utilizada en toda la aplicación
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
