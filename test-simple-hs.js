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

// Función para probar un código HS específico
async function testSingleHSCode(token, hsCode) {
    try {
        console.log(`\n🧪 Probando código HS: ${hsCode}`);
        
        const shippingData = {
            address_from: {
                province: "Distrito Federal",
                city: "Miguel Hidalgo",
                name: "Test Name",
                zip: "11000",
                country: "MX",
                address1: "Test Address 123",
                company: "Trebodeluxe",
                phone: "+525512345678",
                email: "test@trebodeluxe.com"
            },
            address_to: {
                province: "New York",
                city: "New York",
                name: "Customer Name", 
                zip: "10001",
                country: "US",
                address1: "123 Customer St",
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
                    name: "Test Product",
                    sku: "TEST-001",
                    quantity: 1,
                    value: 25.00,
                    hs_code: hsCode
                }]
            }
        };
        
        const response = await axios.post(
            `${SKYDROPX_BASE_URL}/shipments/quotes`,
            shippingData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log(`✅ Código ${hsCode} es VÁLIDO`);
        return { valid: true, hsCode };
        
    } catch (error) {
        if (error.response?.status === 422) {
            console.log(`❌ Código ${hsCode} es INVÁLIDO - Error 422`);
            return { valid: false, hsCode, error: 'Invalid HS Code' };
        } else {
            console.log(`⚠️  Error de conectividad probando ${hsCode}: ${error.message}`);
            return { valid: false, hsCode, error: error.message };
        }
    }
}

async function main() {
    try {
        console.log('🔐 =====================================');
        console.log('🔐 TEST SIMPLE DE CÓDIGOS HS          🔐');
        console.log('🔐 =====================================');
        
        // Generar nuevo token
        const token = await generateBearerToken();
        
        // Códigos básicos para probar
        const codesToTest = [
            '6109.10.00', // Camisetas de algodón
            '6203.42.30', // Pantalones de algodón para hombres
            '6204.62.40'  // Pantalones de algodón para mujeres
        ];
        
        console.log('\n📋 Probando códigos HS básicos...\n');
        
        for (const hsCode of codesToTest) {
            const result = await testSingleHSCode(token, hsCode);
            
            if (result.valid) {
                console.log(`\n🎉 ÉXITO: El código ${hsCode} es válido en SkyDropX`);
                console.log('   Este código se puede usar en producción.\n');
                break; // Si encontramos uno válido, paramos
            }
            
            // Pausa entre requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

// Ejecutar el test
main();
