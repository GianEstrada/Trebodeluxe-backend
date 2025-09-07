const axios = require('axios');
const { SkyDropXAuth } = require('./src/utils/skydropx-auth');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

async function testSkyDropXDirectly() {
  console.log('🧪 ========================================');
  console.log('🧪 TESTING DIRECTO A API SKYDROPX');
  console.log('🧪 ========================================');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  try {
    // Inicializar autenticación
    const skyDropXAuth = new SkyDropXAuth();
    const token = await skyDropXAuth.getBearerToken();
    
    console.log('✅ Token SkyDropX obtenido exitosamente');
    console.log('🔑 Token (primeros 20 chars):', token.substring(0, 20) + '...');
    console.log('');

    // Array de códigos HS para probar
    const testCodes = [
      { code: '6109.10.10', description: 'T-shirts de algodón específicos' },
      { code: '6110.20.20', description: 'Sudaderas de algodón' },
      { code: '6203.42.00', description: 'Pantalones de algodón' },
      { code: '6402.99.00', description: 'Calzado general' },
      { code: '6217.90.90', description: 'Accesorios textiles' },
      { code: '6108.32.00', description: 'Ropa interior de algodón' },
      // Códigos alternativos más básicos
      { code: '6109.10.00', description: 'T-shirts básicos' },
      { code: '6110.20.00', description: 'Sudaderas básicas' },
      { code: '6203.42.90', description: 'Pantalones otros' },
      { code: '6109.90.10', description: 'T-shirts otros materiales' },
      { code: '6307.90.00', description: 'Artículos textiles generales' }
    ];

    for (const testCode of testCodes) {
      console.log(`🔍 ===== PROBANDO CÓDIGO HS: ${testCode.code} =====`);
      console.log(`📋 Descripción: ${testCode.description}`);
      
      const payload = {
        quotation: {
          order_id: `test_hs_${testCode.code.replace(/\./g, '_')}_${Date.now()}`,
          address_from: {
            country_code: "MX",
            postal_code: "64000",
            area_level1: "Nuevo León",
            area_level2: "Monterrey",
            area_level3: "Monterrey Centro"
          },
          address_to: {
            country_code: "US",
            postal_code: "61422",
            area_level1: "Illinois",
            area_level2: "Bushnell",
            area_level3: "Bushnell"
          },
          parcels: [{
            length: 30,
            width: 20,
            height: 10,
            weight: 1,
            products: [{
              hs_code: testCode.code,
              description_en: "Cotton clothing item from Mexico",
              country_code: "MX",
              quantity: 1,
              price: 500
            }]
          }],
          shipment_type: "package",
          quote_type: "carrier"
        }
      };

      console.log('📤 Enviando payload de prueba...');
      
      try {
        const response = await axios.post(
          'https://pro.skydropx.com/api/v1/quotations',
          payload,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        console.log(`✅ CÓDIGO ${testCode.code}: VÁLIDO`);
        console.log('📊 Status:', response.status);
        console.log('📋 Cotizaciones encontradas:', response.data?.data?.length || 0);
        if (response.data?.data && response.data.data.length > 0) {
          console.log('🎯 Primera cotización:', {
            carrier: response.data.data[0]?.provider?.name,
            service: response.data.data[0]?.service_name,
            price: response.data.data[0]?.total_pricing
          });
        }
        console.log('✅ CÓDIGO FUNCIONANDO CORRECTAMENTE\n');

      } catch (error) {
        console.log(`❌ CÓDIGO ${testCode.code}: ERROR`);
        console.log('📊 Status:', error.response?.status || 'No status');
        console.log('📋 Error message:', error.response?.data?.message || error.message);
        
        if (error.response?.data?.errors) {
          console.log('🔍 Errores detallados:', JSON.stringify(error.response.data.errors, null, 2));
        }
        
        if (error.response?.status === 422) {
          console.log('⚠️  CÓDIGO HS INVÁLIDO EN SKYDROPX');
        }
        console.log('❌ CÓDIGO NO FUNCIONA\n');
      }

      // Pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('🧪 ========================================');
    console.log('🧪 TESTING COMPLETADO');
    console.log('🧪 ========================================');

  } catch (error) {
    console.error('❌ Error general en testing:', error.message);
    console.error('🔍 Stack:', error.stack);
  }
}

// Ejecutar test
testSkyDropXDirectly();
