const ProductModel = require('./src/models/product.model.js');

async function testQueries() {
  try {
    console.log('Probando getRecent...');
    const recent = await ProductModel.getRecent(3);
    console.log('✅ getRecent funciona:', recent.length, 'productos');
    
    console.log('\nProbando getRecentByCategory...');
    const recentByCategory = await ProductModel.getRecentByCategory(2);
    console.log('✅ getRecentByCategory funciona:', recentByCategory.length, 'productos');
    
    console.log('\nProbando getBestPromotions...');
    const promotions = await ProductModel.getBestPromotions(3);
    console.log('✅ getBestPromotions funciona:', promotions.length, 'productos');
    
    console.log('\n🎉 Todas las consultas funcionan correctamente!');
    process.exit(0);
  } catch(err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testQueries();
