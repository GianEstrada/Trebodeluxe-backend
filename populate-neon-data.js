// populate-neon-data.js
require('dotenv').config();
const { Pool } = require('pg');

async function populateNeonData() {
  console.log('📦 Poblando Neon DB con datos básicos...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    
    // 1. Crear usuarios admin (usando hash temporal - necesitará ser actualizado)
    console.log('👤 Creando usuarios administrativos...');
    
    // Hash temporal para admin123 (deberá ser actualizado con bcrypt real)
    const tempHash = '$2b$10$rGz.2H9.0iL.1L.1L.1L.1LKlKlKlKlKlKlKlKlKlKlKlKl'; // Hash dummy
    
    // Usuario admin principal
    await client.query(`
      INSERT INTO usuarios (nombres, apellidos, correo, usuario, contrasena, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (correo) DO NOTHING
    `, ['Admin', 'User', 'admin@test.com', 'admin', tempHash, 'admin']);
    
    // Usuario JustSix
    await client.query(`
      INSERT INTO usuarios (nombres, apellidos, correo, usuario, contrasena, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (correo) DO NOTHING
    `, ['Gian Karlo Jocsan', 'Estrada Martinez', 'giankarlojocsan.estradamartinez@gmail.com', 'JustSix', tempHash, 'admin']);
    
    console.log('✅ Usuarios admin creados (contraseñas necesitan ser hasheadas)');
    
    // 2. Métodos de envío
    console.log('🚚 Creando métodos de envío...');
    
    const metodosEnvio = [
      ['DHL', 'Envío nacional e internacional'],
      ['FedEx', 'Envío express y estándar'],
      ['Estafeta', 'Envío nacional'],
      ['Correos de México', 'Servicio postal nacional'],
      ['UPS', 'Envío express internacional']
    ];
    
    for (const [nombre, descripcion] of metodosEnvio) {
      await client.query(`
        INSERT INTO metodos_envio (nombre, descripcion)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [nombre, descripcion]);
    }
    
    console.log('✅ Métodos de envío creados');
    
    // 3. Métodos de pago
    console.log('💳 Creando métodos de pago...');
    
    const metodosPago = [
      ['Tarjeta de Crédito', 'Visa, MasterCard, American Express'],
      ['Tarjeta de Débito', 'Débito bancario'],
      ['PayPal', 'Pago a través de PayPal'],
      ['Transferencia Bancaria', 'Transferencia directa'],
      ['Efectivo contra entrega', 'Pago al recibir el producto'],
      ['OXXO', 'Pago en tiendas OXXO']
    ];
    
    for (const [nombre, descripcion] of metodosPago) {
      await client.query(`
        INSERT INTO metodos_pago (nombre, descripcion)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [nombre, descripcion]);
    }
    
    console.log('✅ Métodos de pago creados');
    
    // 4. Sistemas de talla
    console.log('📏 Creando sistemas de talla...');
    
    const sistemaTallas = [
      ['Ropa General', ['XS', 'S', 'M', 'L', 'XL', 'XXL']],
      ['Zapatos US', ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']],
      ['Zapatos MX', ['22', '22.5', '23', '23.5', '24', '24.5', '25', '25.5', '26', '26.5', '27', '27.5', '28']],
      ['Numérico', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']]
    ];
    
    for (const [nombreSistema, tallas] of sistemaTallas) {
      const sistemaResult = await client.query(`
        INSERT INTO sistemas_talla (nombre)
        VALUES ($1)
        RETURNING id_sistema_talla
      `, [nombreSistema]);
      
      const sistemaId = sistemaResult.rows[0].id_sistema_talla;
      
      for (let i = 0; i < tallas.length; i++) {
        await client.query(`
          INSERT INTO tallas (id_sistema_talla, nombre_talla, orden)
          VALUES ($1, $2, $3)
        `, [sistemaId, tallas[i], i + 1]);
      }
    }
    
    console.log('✅ Sistemas de talla creados');
    
    // 5. Categorías básicas
    console.log('📂 Creando categorías...');
    
    const categorias = [
      ['Playeras', 'Playeras y camisetas'],
      ['Hoodies', 'Sudaderas y hoodies'],
      ['Pantalones', 'Pantalones y shorts'],
      ['Zapatos', 'Calzado deportivo y casual'],
      ['Accesorios', 'Gorras, calcetines y más']
    ];
    
    for (let i = 0; i < categorias.length; i++) {
      const [nombre, descripcion] = categorias[i];
      await client.query(`
        INSERT INTO categorias (nombre, descripcion, orden, activo)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (nombre) DO NOTHING
      `, [nombre, descripcion, i + 1, true]);
    }
    
    console.log('✅ Categorías creadas');
    
    // 6. Verificar resultados
    console.log('🔍 Verificando datos creados...');
    
    const usuarios = await client.query('SELECT COUNT(*) as total FROM usuarios WHERE rol = $1', ['admin']);
    const envios = await client.query('SELECT COUNT(*) as total FROM metodos_envio');
    const pagos = await client.query('SELECT COUNT(*) as total FROM metodos_pago');
    const sistemas = await client.query('SELECT COUNT(*) as total FROM sistemas_talla');
    const tallasCount = await client.query('SELECT COUNT(*) as total FROM tallas');
    const categoriasCount = await client.query('SELECT COUNT(*) as total FROM categorias');
    
    console.log('📊 Resumen de datos creados:');
    console.log(`  👤 Usuarios admin: ${usuarios.rows[0].total}`);
    console.log(`  🚚 Métodos de envío: ${envios.rows[0].total}`);
    console.log(`  💳 Métodos de pago: ${pagos.rows[0].total}`);
    console.log(`  📏 Sistemas de talla: ${sistemas.rows[0].total}`);
    console.log(`  👕 Tallas totales: ${tallasCount.rows[0].total}`);
    console.log(`  📂 Categorías: ${categoriasCount.rows[0].total}`);
    
    client.release();
    console.log('🎉 Datos básicos poblados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error poblando datos:', error);
  } finally {
    await pool.end();
  }
}

populateNeonData();
