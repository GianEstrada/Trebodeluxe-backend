// test-product-api.js
require('dotenv').config();
const { Pool } = require('pg');

async function testProductAPI() {
  console.log('🧪 Simulando API de creación de producto...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    
    // Simular datos que llegan del frontend
    const mockData = {
      producto_nombre: "Test Producto",
      producto_descripcion: "Descripción de prueba",
      categoria: "Playeras",
      marca: "Test Brand",
      id_sistema_talla: 1,
      variantes: [
        {
          nombre: "Variante Test",
          precio: 29.99,
          imagenes: [
            {
              url: "https://res.cloudinary.com/test/image.jpg",
              public_id: "test/image"
            }
          ],
          tallas: [
            {
              id_talla: 1,
              cantidad: 10
            }
          ]
        }
      ]
    };
    
    console.log('📦 Datos de prueba:', JSON.stringify(mockData, null, 2));
    
    await client.query('BEGIN');
    
    // 1. Verificar que las tablas necesarias tengan las columnas correctas
    console.log('\n🔍 Verificando estructura de tabla productos...');
    const productCols = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de productos:');
    productCols.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // 2. Crear producto usando la estructura exacta de la API
    console.log('\n📝 Creando producto...');
    
    // Convertir categoría a ID si es string
    let id_categoria = mockData.categoria;
    if (typeof mockData.categoria === 'string') {
      const catResult = await client.query(
        'SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER($1)',
        [mockData.categoria]
      );
      
      if (catResult.rows.length > 0) {
        id_categoria = catResult.rows[0].id_categoria;
        console.log(`✅ Categoría encontrada: ${mockData.categoria} -> ID ${id_categoria}`);
      } else {
        console.log(`⚠️ Categoría "${mockData.categoria}" no encontrada, usando Playeras`);
        id_categoria = 1; // Playeras
      }
    }
    
    const productQuery = `
      INSERT INTO productos (nombre, descripcion, id_categoria, marca, id_sistema_talla)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_producto;
    `;
    
    const productResult = await client.query(productQuery, [
      mockData.producto_nombre, 
      mockData.producto_descripcion, 
      id_categoria, 
      mockData.marca, 
      mockData.id_sistema_talla
    ]);
    
    const id_producto = productResult.rows[0].id_producto;
    console.log('✅ Producto creado con ID:', id_producto);
    
    // 3. Crear variante
    console.log('\n🎨 Creando variante...');
    const variante = mockData.variantes[0];
    
    const variantQuery = `
      INSERT INTO variantes (id_producto, nombre)
      VALUES ($1, $2)
      RETURNING id_variante;
    `;
    
    const variantResult = await client.query(variantQuery, [
      id_producto,
      variante.nombre
    ]);
    
    const id_variante = variantResult.rows[0].id_variante;
    console.log('✅ Variante creada con ID:', id_variante);
    
    // 4. Agregar imagen
    console.log('\n🖼️ Agregando imagen...');
    if (variante.imagenes && variante.imagenes.length > 0) {
      const imagen = variante.imagenes[0];
      const imageQuery = `
        INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
        VALUES ($1, $2, $3, $4);
      `;
      
      await client.query(imageQuery, [
        id_variante,
        imagen.url,
        imagen.public_id,
        1
      ]);
      console.log('✅ Imagen agregada');
    }
    
    // 5. Agregar stock
    console.log('\n📦 Agregando stock...');
    if (variante.tallas && variante.tallas.length > 0) {
      const talla = variante.tallas[0];
      const stockQuery = `
        INSERT INTO stock (id_producto, id_variante, id_talla, cantidad, precio)
        VALUES ($1, $2, $3, $4, $5);
      `;
      
      await client.query(stockQuery, [
        id_producto,
        id_variante,
        talla.id_talla,
        talla.cantidad,
        variante.precio || null
      ]);
      console.log('✅ Stock agregado');
    }
    
    await client.query('COMMIT');
    console.log('\n🎉 Simulación exitosa! Producto completo creado.');
    
    // 6. Verificar resultado
    console.log('\n📊 Verificando resultado...');
    const verification = await client.query(`
      SELECT 
        p.id_producto, p.nombre as producto_nombre,
        v.id_variante, v.nombre as variante_nombre,
        iv.url as imagen_url,
        s.cantidad, s.precio
      FROM productos p
      LEFT JOIN variantes v ON p.id_producto = v.id_producto
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
      LEFT JOIN stock s ON v.id_variante = s.id_variante
      WHERE p.id_producto = $1
    `, [id_producto]);
    
    console.log('Resultado final:', verification.rows);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error en simulación:', error);
    console.error('Stack trace completo:', error.stack);
  }
}

testProductAPI();
