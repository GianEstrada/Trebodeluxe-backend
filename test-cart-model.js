#!/usr/bin/env node

// Test simple de la conexión a la base de datos y las nuevas tablas del carrito
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testCartTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tablas del carrito...\n');
    
    // Verificar si las tablas existen
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('carritos', 'contenido_carrito')
      ORDER BY table_name;
    `);
    
    console.log('📊 Tablas encontradas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No se encontraron las tablas del carrito');
      return;
    }
    
    console.log('\n🧪 Probando funciones del modelo...');
    
    // Importar el modelo del carrito
    const CartModel = require('./src/models/cart.model');
    
    // Generar un token de sesión
    const sessionToken = CartModel.generateSessionToken();
    console.log(`✅ Token generado: ${sessionToken.substring(0, 10)}...`);
    
    // Crear carrito para sesión
    const cartId = await CartModel.getOrCreateCartForSession(sessionToken);
    console.log(`✅ Carrito creado con ID: ${cartId}`);
    
    // Obtener resumen del carrito
    const summary = await CartModel.getCartSummary(cartId);
    console.log(`✅ Resumen obtenido:`, {
      totalItems: summary.totalItems,
      totalFinal: summary.totalFinal,
      itemsCount: summary.items.length
    });
    
    console.log('\n✨ Modelo del carrito funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testCartTables();
