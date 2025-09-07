#!/usr/bin/env node

/**
 * 🔍 MONITOR DE ESTADO DEL BACKEND TREBODELUXE
 * 
 * Verifica el estado de todos los endpoints críticos
 * y proporciona un reporte detallado de la salud del sistema
 */

const https = require('https');

const BASE_URL = 'https://trebodeluxe-backend.onrender.com';

// Endpoints críticos a verificar
const ENDPOINTS = [
    { name: 'Health Check', path: '/api/health', method: 'GET' },
    { name: 'Productos Destacados', path: '/api/products/featured?limit=3', method: 'GET' },
    { name: 'Categorías', path: '/api/products/categories', method: 'GET' },
    { name: 'Carrito', path: '/api/cart', method: 'GET' },
    { name: 'Cotización Envío', path: '/api/skydropx/cart/quote', method: 'POST' },
    { name: 'Configuración Header', path: '/api/site-settings/header', method: 'GET' },
    { name: 'Imágenes Index', path: '/api/public/index-images', method: 'GET' }
];

// Color codes para console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const url = new URL(endpoint.path, BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Backend-Monitor/1.0'
            },
            timeout: 10000
        };

        // Para POST del carrito, agregar datos de prueba
        let postData = null;
        if (endpoint.path.includes('/api/skydropx/cart/quote')) {
            postData = JSON.stringify({
                cartId: 6,
                postalCode: "66058"
            });
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    responseTime,
                    success: res.statusCode >= 200 && res.statusCode < 400,
                    headers: res.headers,
                    data: data.length > 0 ? data : null
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                status: 0,
                responseTime: Date.now() - startTime,
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                status: 0,
                responseTime: 10000,
                success: false,
                error: 'Timeout'
            });
        });

        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function checkAllEndpoints() {
    console.log(`${colors.bold}${colors.blue}🔍 MONITOR DE ESTADO DEL BACKEND TREBODELUXE${colors.reset}`);
    console.log('='.repeat(60));
    console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log('');

    const results = [];
    let totalSuccess = 0;
    let totalTime = 0;

    for (const endpoint of ENDPOINTS) {
        console.log(`🔍 Verificando: ${endpoint.name}...`);
        
        const result = await makeRequest(endpoint);
        results.push({ endpoint, result });
        
        const statusColor = result.success ? colors.green : colors.red;
        const statusIcon = result.success ? '✅' : '❌';
        const statusText = result.success ? 'OK' : 'FALLO';
        
        console.log(`   ${statusIcon} ${statusColor}${statusText}${colors.reset} - ${result.status || 'N/A'} - ${result.responseTime}ms`);
        
        if (result.error) {
            console.log(`   ${colors.red}Error: ${result.error}${colors.reset}`);
        }
        
        if (result.success) {
            totalSuccess++;
        }
        totalTime += result.responseTime;
        
        console.log('');
    }

    // Resumen
    const successRate = (totalSuccess / ENDPOINTS.length) * 100;
    const avgResponseTime = Math.round(totalTime / ENDPOINTS.length);
    
    console.log('='.repeat(60));
    console.log(`${colors.bold}📊 RESUMEN DEL ESTADO${colors.reset}`);
    console.log('');
    
    const healthColor = successRate >= 80 ? colors.green : successRate >= 60 ? colors.yellow : colors.red;
    const healthIcon = successRate >= 80 ? '🟢' : successRate >= 60 ? '🟡' : '🔴';
    
    console.log(`${healthIcon} ${healthColor}Estado General: ${successRate.toFixed(1)}% saludable${colors.reset}`);
    console.log(`✅ Endpoints funcionando: ${totalSuccess}/${ENDPOINTS.length}`);
    console.log(`⏱️ Tiempo promedio de respuesta: ${avgResponseTime}ms`);
    
    if (successRate < 100) {
        console.log('');
        console.log(`${colors.yellow}⚠️ ENDPOINTS CON PROBLEMAS:${colors.reset}`);
        results.forEach(({ endpoint, result }) => {
            if (!result.success) {
                console.log(`   ❌ ${endpoint.name}: ${result.error || `Status ${result.status}`}`);
            }
        });
    }
    
    console.log('');
    console.log('='.repeat(60));
    
    if (successRate >= 80) {
        console.log(`${colors.green}🎉 Backend funcionando correctamente${colors.reset}`);
    } else if (successRate >= 60) {
        console.log(`${colors.yellow}⚠️ Backend con problemas menores - Los errores pueden ser temporales${colors.reset}`);
    } else {
        console.log(`${colors.red}🚨 Backend con problemas serios - Requiere atención inmediata${colors.reset}`);
    }
    
    return {
        successRate,
        avgResponseTime,
        results,
        timestamp: new Date().toISOString()
    };
}

// Ejecutar verificación
if (require.main === module) {
    checkAllEndpoints().catch(console.error);
}

module.exports = { checkAllEndpoints };
