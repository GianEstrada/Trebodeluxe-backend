// create-postal-codes-table.js
const db = require('./src/config/db');

async function createPostalCodesTable() {
  try {
    // Crear tabla de códigos postales y colonias
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS codigos_postales_colonias (
        id SERIAL PRIMARY KEY,
        codigo_postal VARCHAR(10) NOT NULL,
        estado VARCHAR(100) NOT NULL,
        municipio VARCHAR(100) NOT NULL,
        ciudad VARCHAR(100) NOT NULL,
        colonia VARCHAR(150) NOT NULL,
        zona_tipo VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear índice para optimizar búsquedas por código postal
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_codigo_postal 
      ON codigos_postales_colonias (codigo_postal)
    `);
    
    console.log('✅ Tabla codigos_postales_colonias creada');
    
    // Insertar datos de ejemplo para códigos postales de Monterrey
    const sampleData = [
      { cp: '66058', estado: 'Nuevo León', municipio: 'General Escobedo', ciudad: 'General Escobedo', colonia: 'Praderas de Escobedo' },
      { cp: '66058', estado: 'Nuevo León', municipio: 'General Escobedo', ciudad: 'General Escobedo', colonia: 'Praderas de Escobedo 2do Sector' },
      { cp: '66058', estado: 'Nuevo León', municipio: 'General Escobedo', ciudad: 'General Escobedo', colonia: 'Valle de Escobedo' },
      { cp: '64000', estado: 'Nuevo León', municipio: 'Monterrey', ciudad: 'Monterrey', colonia: 'Centro' },
      { cp: '64000', estado: 'Nuevo León', municipio: 'Monterrey', ciudad: 'Monterrey', colonia: 'Barrio Antiguo' },
      { cp: '64650', estado: 'Nuevo León', municipio: 'Monterrey', ciudad: 'Monterrey', colonia: 'Residencial Santa Bárbara' },
      { cp: '64650', estado: 'Nuevo León', municipio: 'Monterrey', ciudad: 'Monterrey', colonia: 'Colinas de Santa Bárbara' },
      { cp: '64100', estado: 'Nuevo León', municipio: 'Monterrey', ciudad: 'Monterrey', colonia: 'Del Valle' },
      { cp: '64100', estado: 'Nuevo León', municipio: 'Monterrey', ciudad: 'Monterrey', colonia: 'Del Valle Oriente' },
      { cp: '66220', estado: 'Nuevo León', municipio: 'San Pedro Garza García', ciudad: 'San Pedro Garza García', colonia: 'Del Valle' },
      { cp: '66220', estado: 'Nuevo León', municipio: 'San Pedro Garza García', ciudad: 'San Pedro Garza García', colonia: 'Del Valle Sector Fátima' }
    ];
    
    for (const data of sampleData) {
      await db.pool.query(`
        INSERT INTO codigos_postales_colonias (codigo_postal, estado, municipio, ciudad, colonia, zona_tipo)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [data.cp, data.estado, data.municipio, data.ciudad, data.colonia, 'Urbana']);
    }
    
    console.log('✅ Datos de ejemplo insertados');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

createPostalCodesTable();
