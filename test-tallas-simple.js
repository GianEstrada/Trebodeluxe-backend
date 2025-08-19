// Test simple para verificar que la función getFeatured esté devolviendo tallas

const express = require('express');
const app = express();

// Simulamos el resultado que debería devolver getFeatured con tallas
const sampleFeaturedProduct = {
  id_producto: 1,
  nombre: "Camiseta Test",
  descripcion: "Camiseta de prueba",
  categoria_nombre: "Camisetas",
  marca: "Test Brand",
  variantes: [
    {
      id_variante: 1,
      nombre: "Rojo",
      precio: 25.99,
      imagenes: [],
      stock_total: 10,
      disponible: true
    }
  ],
  tallas_disponibles: [
    {
      id_talla: 1,
      nombre_talla: "S"
    },
    {
      id_talla: 2,
      nombre_talla: "M"
    },
    {
      id_talla: 3,
      nombre_talla: "L"
    }
  ]
};

console.log('🔍 PRUEBA: Producto Featured con tallas incluidas');
console.log('📦 Producto:', sampleFeaturedProduct.nombre);
console.log('🏷️ Variantes:', sampleFeaturedProduct.variantes.length);
console.log('📏 Tallas disponibles:', sampleFeaturedProduct.tallas_disponibles.length);
console.log('   Tallas:', sampleFeaturedProduct.tallas_disponibles.map(t => t.nombre_talla).join(', '));

// Test de transformación en frontend
function transformToLegacyFormat(product) {
  if (!product) return null;

  const sortedVariants = product.variantes || [];
  const firstVariant = sortedVariants[0];
  
  // Obtener todas las tallas disponibles en stock
  const availableSizes = product.tallas_disponibles && product.tallas_disponibles.length > 0 ? 
    product.tallas_disponibles.map(t => t.nombre_talla).join(', ') : 'Sin tallas';

  return {
    id: product.id_producto,
    name: product.nombre,
    price: firstVariant ? firstVariant.precio : 0,
    category: product.categoria_nombre,
    brand: product.marca,
    size: availableSizes, // ⭐ ESTA ES LA CLAVE
    inStock: true,
    variantes: product.variantes || [],
    tallas_disponibles: product.tallas_disponibles || []
  };
}

console.log('\n🔄 TRANSFORMACIÓN FRONTEND:');
const transformed = transformToLegacyFormat(sampleFeaturedProduct);
console.log('✅ size:', transformed.size); // Esto debe mostrar "S, M, L"
console.log('✅ tallas_disponibles:', transformed.tallas_disponibles.length);

if (transformed.size === 'Sin tallas') {
  console.log('❌ PROBLEMA: Las tallas no se están mostrando correctamente');
} else {
  console.log('🎯 ÉXITO: Las tallas se muestran correctamente:', transformed.size);
}
