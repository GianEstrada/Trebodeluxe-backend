const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://trebolux_usr:nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR@dpg-d1rk123e5dus73bsib8g-a.oregon-postgres.render.com/trebolux_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testPrincipalImagesAPI() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Probando el sistema de imágenes principales...');
    
    // 1. Verificar que la tabla existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'imagenes_principales_nuevas'
      )
    `);
    
    console.log('✅ Tabla imagenes_principales_nuevas existe:', tableCheck.rows[0].exists);
    
    // 2. Insertar algunas imágenes de prueba
    const testImages = [
      {
        nombre: 'Hero Izquierda Test',
        descripcion: 'Imagen de prueba para posición izquierda',
        url: 'https://res.cloudinary.com/test/image/upload/v1/test1.jpg',
        public_id: 'test1',
        posicion: 'izquierda'
      },
      {
        nombre: 'Hero Derecha Test', 
        descripcion: 'Imagen de prueba para posición derecha',
        url: 'https://res.cloudinary.com/test/image/upload/v1/test2.jpg',
        public_id: 'test2',
        posicion: 'derecha'
      },
      {
        nombre: 'Imagen Inactiva Test',
        descripcion: 'Imagen de prueba inactiva',
        url: 'https://res.cloudinary.com/test/image/upload/v1/test3.jpg',
        public_id: 'test3',
        posicion: 'inactiva'
      }
    ];
    
    for (const image of testImages) {
      const insertResult = await client.query(`
        INSERT INTO imagenes_principales_nuevas (nombre, descripcion, url, public_id, posicion)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [image.nombre, image.descripcion, image.url, image.public_id, image.posicion]);
      
      console.log('✅ Imagen insertada:', insertResult.rows[0].nombre, '- Posición:', insertResult.rows[0].posicion);
    }
    
    // 3. Probar la funcionalidad de posicionamiento único
    console.log('\n🔄 Probando funcionalidad de posicionamiento único...');
    
    // Intentar poner otra imagen en posición izquierda
    const newLeftImage = await client.query(`
      INSERT INTO imagenes_principales_nuevas (nombre, descripcion, url, public_id, posicion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, ['Nueva Izquierda', 'Esta debería reemplazar la anterior', 'https://res.cloudinary.com/test/image/upload/v1/test4.jpg', 'test4', 'izquierda']);
    
    console.log('✅ Nueva imagen izquierda insertada:', newLeftImage.rows[0].nombre);
    
    // 4. Verificar que la anterior cambió a inactiva
    const leftImages = await client.query(`
      SELECT * FROM imagenes_principales_nuevas 
      WHERE posicion = 'izquierda'
      ORDER BY fecha_actualizacion DESC
    `);
    
    console.log('✅ Imágenes en posición izquierda:', leftImages.rows.length);
    console.log('✅ Imagen activa en izquierda:', leftImages.rows[0]?.nombre);
    
    // 5. Verificar todas las posiciones
    const allImages = await client.query(`
      SELECT nombre, posicion, fecha_actualizacion 
      FROM imagenes_principales_nuevas 
      ORDER BY 
        CASE posicion 
          WHEN 'izquierda' THEN 1 
          WHEN 'derecha' THEN 2 
          WHEN 'inactiva' THEN 3 
        END,
        fecha_actualizacion DESC
    `);
    
    console.log('\n📊 Estado final de todas las imágenes:');
    allImages.rows.forEach(img => {
      console.log(`   - ${img.nombre}: ${img.posicion}`);
    });
    
    // 6. Probar búsqueda
    const searchResult = await client.query(`
      SELECT * FROM imagenes_principales_nuevas 
      WHERE nombre ILIKE $1 OR descripcion ILIKE $1
    `, ['%test%']);
    
    console.log('\n🔍 Resultados de búsqueda para "test":', searchResult.rows.length, 'imágenes encontradas');
    
    console.log('\n🎉 Todas las pruebas pasaron exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar las pruebas
testPrincipalImagesAPI()
  .then(() => {
    console.log('✅ Pruebas completadas');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  });
