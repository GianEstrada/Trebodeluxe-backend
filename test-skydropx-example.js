require('dotenv').config();
const axios = require('axios');

const SKYDROPX_BASE_URL = 'https://api.skydropx.com/v1';

// Función para generar un nuevo bearer token
async function generateBearerToken() {
    try {
        console.log('🔐 Generando nuevo Bearer token...');
        
        const response = await axios.post(`${SKYDROPX_BASE_URL}/auth/login`, {
            email: process.env.SKYDROPX_EMAIL,
            api_key: process.env.SKYDROPX_API_KEY
        });
        
        if (response.data && response.data.token) {
            console.log('✅ Token generado exitosamente');
            return response.data.token;
        } else {
            throw new Error('No se recibió token en la respuesta');
        }
    } catch (error) {
        console.error('❌ Error generando token:', error.response?.data || error.message);
        throw error;
    }
}

// Función para probar el código HS de ejemplo de SkyDropX
async function testSkyDropXExampleCode(token) {
    try {
        console.log('\n🧪 Probando código HS de ejemplo de SkyDropX: 3407.002000');
        
        const shippingData = {
            address_from: {
                province: "Distrito Federal",
                city: "Miguel Hidalgo",
                name: "Trebodeluxe Store",
                zip: "11000",
                country: "MX",
                address1: "Calle Principal 123",
                company: "Trebodeluxe",
                phone: "+525512345678",
                email: "envios@trebodeluxe.com"
            },
            address_to: {
                province: "New York",
                city: "New York",
                name: "Cliente Prueba", 
                zip: "10001",
                country: "US",
                address1: "123 Test Street",
                company: "Test Company",
                phone: "+15551234567",
                email: "customer@test.com"
            },
            parcels: [{
                weight: 1.0,
                distance_unit: "CM",
                mass_unit: "KG",
                height: 10.0,
                width: 20.0,
                length: 30.0
            }],
            consignment: {
                dutiable: true,
                items: [{
                    name: "Cosmetic Product",
                    sku: "COSM-001",
                    quantity: 1,
                    value: 25.00,
                    hs_code: "3407.002000"
                }]
            }
        };
        
        console.log('📋 Enviando request a SkyDropX...');
        console.log('   📍 Desde: México DF 11000');
        console.log('   📍 Hacia: New York, US 10001');
        console.log('   📦 Producto: Cosmetic Product');
        console.log('   🏷️  Código HS: 3407.002000');
        console.log('   💰 Valor: $25.00 USD');
        
        const response = await axios.post(
            `${SKYDROPX_BASE_URL}/shipments/quotes`,
            shippingData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );
        
        console.log('\n🎉 ¡ÉXITO! El código HS 3407.002000 es VÁLIDO');
        console.log(`✅ Se obtuvieron ${response.data.data.length} cotizaciones`);
        console.log('\n📋 Carriers disponibles:');
        
        response.data.data.forEach((quote, index) => {
            console.log(`   ${index + 1}. ${quote.provider} - $${quote.amount_local} ${quote.currency_local}`);
        });
        
        return { success: true, carriers: response.data.data.length };
        
    } catch (error) {
        if (error.response?.status === 422) {
            console.log('\n❌ Error 422: El código HS 3407.002000 es INVÁLIDO');
            console.log('   Detalles del error:', JSON.stringify(error.response.data, null, 2));
            return { success: false, error: 'Invalid HS Code 422' };
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('\n⚠️  Error de conectividad - No se pudo conectar a SkyDropX');
            return { success: false, error: 'Connectivity Error' };
        } else {
            console.log(`\n❌ Error inesperado: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

async function main() {
    try {
        console.log('🔐 =====================================');
        console.log('🔐 TEST DEL CÓDIGO HS DE SKYDROPX      🔐');
        console.log('🔐 =====================================');
        
        // Generar nuevo token
        const token = await generateBearerToken();
        
        // Probar el código de ejemplo
        const result = await testSkyDropXExampleCode(token);
        
        console.log('\n📊 RESULTADO FINAL:');
        console.log('=====================================');
        
        if (result.success) {
            console.log('✅ El código HS 3407.002000 FUNCIONA correctamente');
            console.log(`📦 Se pueden usar los ${result.carriers} carriers disponibles`);
            console.log('\n🎯 PRÓXIMOS PASOS:');
            console.log('   1. Actualizar códigos HS en la BD con formato de 10 dígitos');
            console.log('   2. Usar 3407.002000 como fallback en el código');
            console.log('   3. Probar la cotización completa en la aplicación');
        } else {
            console.log('❌ El código HS 3407.002000 NO funciona');
            console.log(`   Error: ${result.error}`);
            console.log('\n🔄 RECOMENDACIONES:');
            console.log('   1. Verificar conectividad con SkyDropX');
            console.log('   2. Consultar documentación actualizada de códigos HS');
            console.log('   3. Contactar soporte de SkyDropX para códigos válidos');
        }
        
    } catch (error) {
        console.error('\n💥 ERROR CRÍTICO:', error.message);
    }
}

// Ejecutar el test
main();
