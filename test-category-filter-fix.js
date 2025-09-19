// test-category-filter-fix.js
// Script para probar la corrección del filtro de categorías

const { ProductModel } = require('./src/models/product.model.js');

async function testCategoryFilter() {
    console.log('🧪 Testing Category Filter Fix');
    console.log('================================');
    
    try {
        console.log('\n1. Testing filter with "camisetas"...');
        const camisetasResult = await ProductModel.getByCategory('camisetas', 10);
        console.log('✅ Camisetas result:', {
            totalProducts: camisetasResult.products?.length || 0,
            total: camisetasResult.total,
            firstProduct: camisetasResult.products?.[0]?.nombre || 'No products'
        });
        
        console.log('\n2. Testing filter with "chaquetas"...');
        const chaquetasResult = await ProductModel.getByCategory('chaquetas', 10);
        console.log('✅ Chaquetas result:', {
            totalProducts: chaquetasResult.products?.length || 0,
            total: chaquetasResult.total,
            firstProduct: chaquetasResult.products?.[0]?.nombre || 'No products'
        });
        
        console.log('\n3. Testing categories endpoint...');
        const categories = await ProductModel.getCategories();
        console.log('✅ Available categories:', categories.map(c => ({
            name: c.name || c.categoria,
            slug: c.slug,
            total: c.total_productos
        })));
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Ejecutar el test
testCategoryFilter()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });