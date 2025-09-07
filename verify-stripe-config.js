// Script para verificar la configuración de Stripe desde variables de entorno de Render
require('dotenv').config();
const Stripe = require('stripe');

console.log('🔍 Verificando configuración de Stripe desde variables de entorno...\n');

// Verificar que las variables estén definidas
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

console.log('📋 Estado de variables de entorno:');
console.log('STRIPE_PUBLISHABLE_KEY:', publishableKey ? 'Configurada ✅' : 'NO CONFIGURADA ❌');
console.log('STRIPE_SECRET_KEY:', secretKey ? 'Configurada ✅' : 'NO CONFIGURADA ❌');
console.log('STRIPE_WEBHOOK_SECRET:', webhookSecret ? 'Configurada ✅' : 'NO CONFIGURADA ❌');

if (!secretKey) {
    console.error('\n❌ STRIPE_SECRET_KEY no está configurada en las variables de entorno');
    console.log('\n📋 Para configurar en Render:');
    console.log('1. Ve a https://dashboard.render.com');
    console.log('2. Busca el servicio trebodeluxe-backend');
    console.log('3. Ve a la pestaña "Environment"');
    console.log('4. Agrega: STRIPE_SECRET_KEY = tu_clave_secreta');
    console.log('5. Haz "Manual Deploy" para reiniciar');
    process.exit(1);
}

// Verificar formato de las claves
console.log('\n🔑 Información de las claves:');
if (publishableKey) {
    console.log('Publishable Key:');
    console.log('  - Longitud:', publishableKey.length);
    console.log('  - Tipo:', publishableKey.startsWith('pk_test_') ? 'Test/Sandbox ✅' : 
                       publishableKey.startsWith('pk_live_') ? 'Producción ⚠️' : 'Formato inválido ❌');
    console.log('  - Primeros 20 caracteres:', publishableKey.substring(0, 20) + '...');
}

if (secretKey) {
    console.log('Secret Key:');
    console.log('  - Longitud:', secretKey.length);
    console.log('  - Tipo:', secretKey.startsWith('sk_test_') ? 'Test/Sandbox ✅' : 
                     secretKey.startsWith('sk_live_') ? 'Producción ⚠️' : 'Formato inválido ❌');
    console.log('  - Primeros 20 caracteres:', secretKey.substring(0, 20) + '...');
}

// Verificar que las claves coincidan (test con test, live con live)
if (publishableKey && secretKey) {
    const pubIsTest = publishableKey.startsWith('pk_test_');
    const secIsTest = secretKey.startsWith('sk_test_');
    
    if (pubIsTest === secIsTest) {
        console.log('  - Coincidencia de tipos: ✅');
    } else {
        console.log('  - Coincidencia de tipos: ❌ (una es test y otra live)');
    }
}

// Probar conexión con Stripe
async function testStripeConnection() {
    try {
        console.log('\n🧪 Probando conexión con Stripe...');
        const stripe = Stripe(secretKey);
        
        // Intentar obtener información de la cuenta
        const account = await stripe.accounts.retrieve();
        console.log('✅ Conexión exitosa con Stripe');
        console.log('Account ID:', account.id);
        console.log('Country:', account.country);
        console.log('Default currency:', account.default_currency);
        console.log('Charges enabled:', account.charges_enabled);
        console.log('Payouts enabled:', account.payouts_enabled);
        
        // Probar creación de Payment Intent
        console.log('\n🧪 Probando creación de Payment Intent...');
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 100, // $1.00 en centavos
            currency: 'mxn',
            metadata: {
                test: 'verification_script'
            }
        });
        
        console.log('✅ Payment Intent creado exitosamente');
        console.log('ID:', paymentIntent.id);
        console.log('Amount:', paymentIntent.amount, 'centavos');
        console.log('Currency:', paymentIntent.currency);
        console.log('Status:', paymentIntent.status);
        
    } catch (error) {
        console.error('❌ Error al conectar con Stripe:');
        console.error('Código:', error.code);
        console.error('Mensaje:', error.message);
        console.error('Tipo:', error.type);
        
        if (error.code === 'api_key_invalid') {
            console.log('\n🔧 Solución sugerida:');
            console.log('1. Verifica que la clave secreta esté correcta en Render');
            console.log('2. Asegúrate de que no tenga espacios o caracteres extra');
            console.log('3. Reinicia el servicio después de cambiar la variable');
        }
    }
}

// Ejecutar prueba solo si tenemos la clave secreta
if (secretKey) {
    testStripeConnection();
} else {
    console.log('\n⏭️ Saltando prueba de conexión (falta STRIPE_SECRET_KEY)');
}
