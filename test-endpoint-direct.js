/**
 * test-endpoint-direct.js
 * Prueba directa del endpoint getById del ProductModel
 */

const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

// Importar el modelo
const ProductModel = require('./src/models/product.model');

async function testProductModelGetById() {
    try {
        console.log('🧪 Probando ProductModel.getById directamente...\n');
        
        const productId = 5; // Lucky Club Hoodie
        console.log(`🔍 Buscando producto ID: ${productId}`);
        
        const product = await ProductModel.getById(productId);
        
        if (product) {
            console.log('✅ Producto encontrado:', product.nombre);
            console.log('📋 Número de variantes:', product.variantes?.length || 0);
            
            if (product.variantes && product.variantes.length > 0) {
                console.log('\n🎨 Detalles de variantes:');
                product.variantes.forEach((variant, index) => {
                    console.log(`\n${index + 1}. ${variant.nombre} (ID: ${variant.id_variante})`);
                    console.log(`   - Activa: ${variant.activo}`);
                    console.log(`   - ✅ DISPONIBLE: ${variant.disponible || 'NO DEFINIDO'}`);
                    console.log(`   - Precio: $${variant.precio || 'Sin precio'}`);
                    console.log(`   - Stock total: ${variant.stock_total}`);
                    console.log(`   - Stock disponible: ${variant.stock_disponible}`);
                    console.log(`   - Imágenes: ${variant.imagenes?.length || 0}`);
                    
                    if (variant.disponible !== undefined) {
                        const seraClickeable = variant.disponible && variant.stock_total > 0;
                        console.log(`   - 🎯 ESTADO EN FRONTEND: ${seraClickeable ? '✅ CLICKEABLE' : '❌ DESHABILITADO'}`);
                    } else {
                        console.log(`   - ⚠️  CAMPO 'disponible' NO ENCONTRADO`);
                    }
                });
                
                // Verificar específicamente la variante Negra
                const varianteNegra = product.variantes.find(v => v.nombre.toLowerCase().includes('negra'));
                if (varianteNegra) {
                    console.log('\n🖤 ANÁLISIS ESPECÍFICO VARIANTE NEGRA:');
                    console.log(`   - Tiene campo 'disponible': ${varianteNegra.disponible !== undefined ? '✅ SÍ' : '❌ NO'}`);
                    console.log(`   - Valor 'disponible': ${varianteNegra.disponible}`);
                    console.log(`   - Stock total: ${varianteNegra.stock_total}`);
                    console.log(`   - Activa: ${varianteNegra.activo}`);
                    console.log(`   - Precio: ${varianteNegra.precio}`);
                    
                    if (varianteNegra.disponible !== undefined) {
                        const condicionFrontend = !varianteNegra.disponible || varianteNegra.stock_total <= 0;
                        console.log(`   - 🎯 Condición frontend (!disponible || stock <= 0): ${condicionFrontend}`);
                        console.log(`   - 🎯 Estado botón: ${condicionFrontend ? '❌ DESHABILITADO' : '✅ HABILITADO'}`);
                    }
                } else {
                    console.log('\n🖤 ❌ VARIANTE NEGRA NO ENCONTRADA');
                }
                
            } else {
                console.log('\n❌ No se encontraron variantes');
            }
            
        } else {
            console.log('❌ No se encontró el producto');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

testProductModelGetById();
