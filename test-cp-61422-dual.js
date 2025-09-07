const axios = require('axios');

async function testCP61422() {
    console.log('🔍 Probando CP 61422 en ambos países...\n');

    // Test 1: Como código postal de USA
    console.log('📍 Test 1: CP 61422 como USA');
    console.log('='.repeat(40));
    try {
        const responseUSA = await axios.get('http://api.zippopotam.us/us/61422');
        console.log('✅ ÉXITO - USA:');
        console.log(`   País: ${responseUSA.data.country}`);
        console.log(`   Código: ${responseUSA.data['country abbreviation']}`);
        console.log(`   Código Postal: ${responseUSA.data['post code']}`);
        
        if (responseUSA.data.places && responseUSA.data.places.length > 0) {
            const place = responseUSA.data.places[0];
            console.log(`   Estado: ${place.state} (${place['state abbreviation']})`);
            console.log(`   Ciudad: ${place['place name']}`);
            console.log(`   Latitud: ${place.latitude}`);
            console.log(`   Longitud: ${place.longitude}`);
        }
    } catch (error) {
        console.log('❌ ERROR - USA:');
        console.log(`   Status: ${error.response?.status || 'Sin respuesta'}`);
        console.log(`   Mensaje: ${error.response?.statusText || error.message}`);
    }

    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 2: Como código postal de México
    console.log('📍 Test 2: CP 61422 como México');
    console.log('='.repeat(40));
    try {
        const responseMX = await axios.get('http://api.zippopotam.us/mx/61422');
        console.log('✅ ÉXITO - México:');
        console.log(`   País: ${responseMX.data.country}`);
        console.log(`   Código: ${responseMX.data['country abbreviation']}`);
        console.log(`   Código Postal: ${responseMX.data['post code']}`);
        
        if (responseMX.data.places && responseMX.data.places.length > 0) {
            const place = responseMX.data.places[0];
            console.log(`   Estado: ${place.state} (${place['state abbreviation']})`);
            console.log(`   Ciudad: ${place['place name']}`);
            console.log(`   Latitud: ${place.latitude}`);
            console.log(`   Longitud: ${place.longitude}`);
        }
    } catch (error) {
        console.log('❌ ERROR - México:');
        console.log(`   Status: ${error.response?.status || 'Sin respuesta'}`);
        console.log(`   Mensaje: ${error.response?.statusText || error.message}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('📋 CONCLUSIÓN:');
    console.log('El código postal 61422 existe en el país donde se obtuvo respuesta exitosa.');
    console.log('Si ambos fallan, el CP no es válido en ninguno de los dos países.');
    console.log('Si ambos tienen éxito, necesitamos más contexto para determinar el correcto.');
}

// Ejecutar el test
testCP61422().catch(console.error);
