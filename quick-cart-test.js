#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://trebodeluxe-backend.onrender.com';

async function quickCartTest() {
    console.log('🧪 Prueba rápida de la API del carrito...\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/cart`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Respuesta exitosa:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Error en la petición:');
        console.log('Status:', error.response?.status);
        console.log('Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Message:', error.message);
    }
}

quickCartTest();
