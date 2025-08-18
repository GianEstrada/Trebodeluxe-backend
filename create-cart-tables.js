#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos usando las variables de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createCartTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // Leer el archivo SQL de las tablas del carrito
    const cartSqlPath = path.join(__dirname, 'src/config/cart_tables.sql');
    const cartSql = fs.readFileSync(cartSqlPath, 'utf8');
    
    console.log('🚀 Ejecutando script de creación de tablas del carrito...');
    
    // Ejecutar el SQL
    await client.query('BEGIN');
    await client.query(cartSql);
    await client.query('COMMIT');
    
    console.log('✅ Tablas del carrito creadas exitosamente');
    
    // Verificar que las tablas fueron creadas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('carritos', 'contenido_carrito')
      ORDER BY table_name;
    `);
    
    console.log('📊 Tablas creadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verificar las columnas de las tablas
    console.log('\n📋 Estructura de las tablas:');
    
    // Columnas de carritos
    const carritosColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'carritos' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n🛒 Tabla carritos:');
    carritosColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Columnas de contenido_carrito
    const contenidoColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'contenido_carrito' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📦 Tabla contenido_carrito:');
    contenidoColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando las tablas del carrito:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar el script
createCartTables().catch(console.error);
