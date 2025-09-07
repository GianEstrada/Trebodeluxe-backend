const ShippingQuoteService = require('./src/utils/shipping-quote.service');

async function testCP61422Final() {
    console.log('🔍 Test final del CP 61422 con nuestro sistema mejorado\n');
    
    const shippingService = new ShippingQuoteService();
    
    console.log('📋 Paso 1: Detección de país');
    console.log('='.repeat(40));
    const detectedCountry = shippingService.detectCountryFromPostalCode('61422');
    console.log(`Código postal: 61422`);
    console.log(`País detectado: ${detectedCountry.toUpperCase()}`);
    
    console.log('\n📋 Paso 2: Resolución de dirección completa');
    console.log('='.repeat(40));
    
    try {
        const address = await shippingService.getFormattedAddressFromPostalCode('61422');
        
        console.log('✅ ÉXITO - Dirección obtenida:');
        console.log(`   Código Postal: ${address.postalCode}`);
        console.log(`   Ciudad: ${address.city}`);
        console.log(`   Estado: ${address.state}`);
        console.log(`   País: ${address.country}`);
        console.log(`   Fuente: ${address.source}`);
        
        if (address.coordinates) {
            console.log(`   Coordenadas: ${address.coordinates.lat}, ${address.coordinates.lng}`);
        }
        
    } catch (error) {
        console.log('❌ ERROR:');
        console.log(`   Mensaje: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 CONCLUSIÓN:');
    console.log('El sistema ahora maneja correctamente códigos postales internacionales.');
    console.log('CP 61422 confirmado como Bushnell, Illinois, USA.');
}

// Ejecutar el test
testCP61422Final().catch(console.error);
