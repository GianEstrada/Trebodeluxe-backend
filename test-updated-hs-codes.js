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

// Función para probar códigos HS específicos
async function testHSCode(token, hsCode, productName) {
    try {
        console.log(`\n🧪 Probando código HS: ${hsCode} (${productName})`);
        
        const shippingData = {
            address_from: {
                province: "Distrito Federal",
                city: "Miguel Hidalgo",
                name: "John Doe",
                zip: "11000",
                country: "MX",
                address1: "Calle Falsa 123",
                company: "Trebodeluxe",
                address2: "",
                phone: "+525512345678",
                email: "test@trebodeluxe.com"
            },
            address_to: {
                province: "New York",
                city: "New York",
                name: "Jane Smith", 
                zip: "10001",
                country: "US",
                address1: "123 Main Street",
                company: "Test Company",
                address2: "Apt 4B",
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
                    name: productName,
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
                }
            }
        );
        
        console.log(`✅ Código ${hsCode} VÁLIDO - Quote generado exitosamente`);
        console.log(`   Carriers disponibles: ${response.data.data.length}`);
        
        return { valid: true, hsCode, productName };
    } catch (error) {
        console.log(`❌ Código ${hsCode} INVÁLIDO`);
        if (error.response?.data) {
            console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return { valid: false, hsCode, productName, error: error.response?.data };
    }
}

// Códigos HS actualizados en la base de datos
const hsCodesTested = [
    { code: '6109.10.00', name: 'Camisetas' },
    { code: '6110.20.00', name: 'Pantalones' },
    { code: '6108.31.00', name: 'Zapatos' },
    { code: '6217.10.00', name: 'Accesorios' },
    { code: '6203.42.00', name: 'Chaquetas' },
    { code: '6204.63.00', name: 'Ropa Interior' }
];

async function main() {
    try {
        console.log('🔐 =====================================');
        console.log('🔐 TESTING CÓDIGOS HS ACTUALIZADOS   🔐');
        console.log('🔐 =====================================');
        
        // Generar nuevo token
        const token = await generateBearerToken();
        
        console.log('\n📋 Probando códigos HS actualizados en BD...\n');
        
        const results = [];
        
        // Probar cada código HS
        for (const hsItem of hsCodesTested) {
            const result = await testHSCode(token, hsItem.code, hsItem.name);
            results.push(result);
            
            // Pausa pequeña entre requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Resumen de resultados
        console.log('\n📊 RESUMEN DE RESULTADOS:');
        console.log('=====================================');
        
        const validCodes = results.filter(r => r.valid);
        const invalidCodes = results.filter(r => !r.valid);
        
        console.log(`✅ Códigos VÁLIDOS: ${validCodes.length}`);
        validCodes.forEach(code => {
            console.log(`   ${code.hsCode} - ${code.productName}`);
        });
        
        console.log(`\n❌ Códigos INVÁLIDOS: ${invalidCodes.length}`);
        invalidCodes.forEach(code => {
            console.log(`   ${code.hsCode} - ${code.productName}`);
        });
        
        if (validCodes.length > 0) {
            console.log('\n🎉 ¡Se encontraron códigos HS válidos!');
            console.log('Estos códigos pueden usarse en producción.');
        } else {
            console.log('\n⚠️  NINGÚN código HS es válido según SkyDropX');
            console.log('Necesitamos buscar códigos HS alternativos.');
        }
        
    } catch (error) {
        console.error('❌ Error general en el test:', error.message);
    }
}

// Ejecutar el test
main();
