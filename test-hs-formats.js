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
async function testHSCode(token, hsCode, description) {
    try {
        console.log(`\n🧪 Probando: ${hsCode} (${description})`);
        
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
                name: "Cliente Test", 
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
        
        console.log(`   ✅ VÁLIDO - ${response.data.data.length} carriers disponibles`);
        return { valid: true, hsCode, description, carriers: response.data.data.length };
        
    } catch (error) {
        if (error.response?.status === 422) {
            console.log(`   ❌ INVÁLIDO - Error 422`);
            if (error.response.data?.errors) {
                console.log(`   📝 Detalle: ${JSON.stringify(error.response.data.errors)}`);
            }
            return { valid: false, hsCode, description, error: '422 Invalid HS Code' };
        } else if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
            console.log(`   ⚠️  Error de conectividad`);
            return { valid: null, hsCode, description, error: 'Connectivity Error' };
        } else {
            console.log(`   ❌ Error: ${error.message}`);
            return { valid: false, hsCode, description, error: error.message };
        }
    }
}

// Códigos HS en diferentes formatos para probar
const hsCodeTests = [
    // Formatos de 6 dígitos (básico internacional)
    { code: "610910", desc: "Camisetas - 6 dígitos sin puntos" },
    { code: "6109.10", desc: "Camisetas - 6 dígitos con punto" },
    
    // Formatos de 8 dígitos 
    { code: "61091000", desc: "Camisetas - 8 dígitos sin puntos" },
    { code: "6109.10.00", desc: "Camisetas - 8 dígitos con puntos" },
    
    // Formatos de 10 dígitos
    { code: "6109100000", desc: "Camisetas - 10 dígitos sin puntos" },
    { code: "6109.100000", desc: "Camisetas - 10 dígitos con punto" },
    { code: "6109.10.0000", desc: "Camisetas - 10 dígitos formato US" },
    
    // Códigos específicos comunes en comercio internacional
    { code: "6203420000", desc: "Pantalones hombre - 10 dígitos" },
    { code: "6204620000", desc: "Pantalones mujer - 10 dígitos" },
    { code: "6403999000", desc: "Calzado - 10 dígitos" },
    
    // Códigos genéricos que suelen funcionar
    { code: "9999999999", desc: "Código genérico de prueba" },
    { code: "0000000000", desc: "Código cero de prueba" },
    
    // El código de ejemplo que mencionaste
    { code: "3407002000", desc: "Ejemplo SkyDropX documentación" },
    { code: "3407.002000", desc: "Ejemplo SkyDropX con punto" },
    
    // Códigos textiles comunes más básicos
    { code: "6109", desc: "Camisetas - solo 4 dígitos" },
    { code: "6203", desc: "Pantalones - solo 4 dígitos" },
    { code: "6403", desc: "Calzado - solo 4 dígitos" }
];

async function main() {
    try {
        console.log('🔐 =============================================');
        console.log('🔐 ANÁLISIS EXHAUSTIVO DE FORMATOS HS CODES  🔐');
        console.log('🔐 =============================================');
        
        // Generar nuevo token
        const token = await generateBearerToken();
        
        console.log('\n📋 Probando diferentes formatos de códigos HS...\n');
        
        const results = [];
        
        // Probar cada código con pausa entre requests
        for (const test of hsCodeTests) {
            const result = await testHSCode(token, test.code, test.desc);
            results.push(result);
            
            // Pausa de 1 segundo entre requests para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Análisis de resultados
        console.log('\n📊 =====================================');
        console.log('📊 ANÁLISIS DE RESULTADOS              📊');
        console.log('📊 =====================================');
        
        const validCodes = results.filter(r => r.valid === true);
        const invalidCodes = results.filter(r => r.valid === false);
        const errorCodes = results.filter(r => r.valid === null);
        
        console.log(`✅ CÓDIGOS VÁLIDOS: ${validCodes.length}`);
        validCodes.forEach(code => {
            console.log(`   ${code.hsCode} - ${code.description} (${code.carriers} carriers)`);
        });
        
        console.log(`\n❌ CÓDIGOS INVÁLIDOS: ${invalidCodes.length}`);
        invalidCodes.forEach(code => {
            console.log(`   ${code.hsCode} - ${code.description}`);
        });
        
        console.log(`\n⚠️  ERRORES DE CONECTIVIDAD: ${errorCodes.length}`);
        errorCodes.forEach(code => {
            console.log(`   ${code.hsCode} - ${code.description}`);
        });
        
        // Recomendaciones basadas en resultados
        console.log('\n🎯 RECOMENDACIONES:');
        console.log('=====================================');
        
        if (validCodes.length > 0) {
            console.log('✅ CÓDIGOS VÁLIDOS ENCONTRADOS:');
            const bestCode = validCodes[0];
            console.log(`   📌 Usar como fallback: ${bestCode.hsCode}`);
            console.log(`   📝 Formato recomendado: ${bestCode.description}`);
            
            // Identificar el patrón de formato válido
            const validFormats = validCodes.map(c => c.hsCode);
            console.log(`   🔍 Formatos válidos encontrados: ${validFormats.join(', ')}`);
        } else if (errorCodes.length > 0) {
            console.log('⚠️  PROBLEMAS DE CONECTIVIDAD DETECTADOS');
            console.log('   🔧 Verificar conexión a internet');
            console.log('   🔧 Verificar configuración de proxy/firewall');
            console.log('   🔧 Intentar desde diferente red');
        } else {
            console.log('❌ NINGÚN CÓDIGO HS VÁLIDO ENCONTRADO');
            console.log('   📞 Contactar soporte técnico de SkyDropX');
            console.log('   📋 Solicitar lista de códigos HS válidos');
            console.log('   🔍 Revisar documentación actualizada');
        }
        
    } catch (error) {
        console.error('\n💥 ERROR CRÍTICO:', error.message);
    }
}

// Ejecutar el análisis
main();
