const { pool } = require('./src/config/db');

async function testProductCreation() {
  console.log('🧪 Testing product creation with images...');
  
  const testProduct = {
    producto_nombre: "Producto de Prueba",
    producto_descripcion: "Descripción de prueba",
    categoria: "test",
    marca: "test",
    id_sistema_talla: 1,
    variantes: [
      {
        nombre: "Variante Roja",
        precio: 29.99,
        precio_original: 39.99,
        imagenes: [
          {
            url: "https://res.cloudinary.com/dyh8tcvzv/image/upload/v1753254839/trebodeluxe/test/ba7xyqmktglnrpqs4c7a.png",
            public_id: "trebodeluxe/test/ba7xyqmktglnrpqs4c7a"
          }
        ],
        tallas: [
          { id_talla: 1, cantidad: 10 },
          { id_talla: 2, cantidad: 5 }
        ]
      }
    ]
  };

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { 
      producto_nombre, 
      producto_descripcion, 
      categoria,
      marca,
      id_sistema_talla,
      variantes 
    } = testProduct;

    // Crear producto
    const productQuery = `
      INSERT INTO productos (nombre, descripcion, categoria, marca, id_sistema_talla)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_producto;
    `;
    
    const productResult = await client.query(productQuery, [
      producto_nombre, 
      producto_descripcion, 
      categoria, 
      marca, 
      id_sistema_talla
    ]);
    
    const id_producto = productResult.rows[0].id_producto;
    console.log('✅ Producto creado con ID:', id_producto);

    // Crear variantes
    for (const variante of variantes) {
      // Crear variante
      const variantQuery = `
        INSERT INTO variantes (id_producto, nombre, precio, precio_original)
        VALUES ($1, $2, $3, $4)
        RETURNING id_variante;
      `;
      
      const variantResult = await client.query(variantQuery, [
        id_producto,
        variante.nombre,
        variante.precio,
        variante.precio_original || null
      ]);
      
      const id_variante = variantResult.rows[0].id_variante;
      console.log('✅ Variante creada con ID:', id_variante);

      // Agregar imágenes si existen
      if (variante.imagenes && variante.imagenes.length > 0) {
        console.log('📸 Agregando', variante.imagenes.length, 'imágenes...');
        for (let i = 0; i < variante.imagenes.length; i++) {
          const imagen = variante.imagenes[i];
          if (imagen.url && imagen.public_id) {
            const imageQuery = `
              INSERT INTO imagenes_variante (id_variante, url, public_id, orden)
              VALUES ($1, $2, $3, $4);
            `;
            
            await client.query(imageQuery, [
              id_variante,
              imagen.url,
              imagen.public_id,
              i + 1
            ]);
            console.log('✅ Imagen guardada:', imagen.url);
          }
        }
      }

      // Agregar stock por tallas
      if (variante.tallas && variante.tallas.length > 0) {
        console.log('📏 Agregando stock para', variante.tallas.length, 'tallas...');
        for (const talla of variante.tallas) {
          if (talla.cantidad > 0) {
            const stockQuery = `
              INSERT INTO stock (id_producto, id_variante, id_talla, cantidad)
              VALUES ($1, $2, $3, $4);
            `;
            
            await client.query(stockQuery, [
              id_producto,
              id_variante,
              talla.id_talla,
              talla.cantidad
            ]);
            console.log('✅ Stock agregado para talla ID', talla.id_talla, ':', talla.cantidad);
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('🎉 ¡Producto creado exitosamente con imágenes!');
    
    // Verificar que se guardó correctamente
    const verifyQuery = `
      SELECT 
        p.nombre as producto,
        v.nombre as variante,
        iv.url as imagen_url,
        iv.public_id
      FROM productos p
      JOIN variantes v ON p.id_producto = v.id_producto
      LEFT JOIN imagenes_variante iv ON v.id_variante = iv.id_variante
      WHERE p.id_producto = $1
      ORDER BY iv.orden;
    `;
    
    const verifyResult = await client.query(verifyQuery, [id_producto]);
    console.log('🔍 Verificación:', verifyResult.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

testProductCreation();
