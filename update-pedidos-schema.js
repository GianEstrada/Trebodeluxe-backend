// update-pedidos-schema.js - Script para actualizar el esquema de pedidos

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updatePedidosSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando actualización del esquema de pedidos...');
    
    // 1. Agregar columna notas si no existe
    console.log('1. Verificando columna notas...');
    const checkNotasColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pedidos' AND column_name = 'notas'
    `);
    
    if (checkNotasColumn.rows.length === 0) {
      console.log('   Agregando columna notas...');
      await client.query('ALTER TABLE pedidos ADD COLUMN notas TEXT');
      console.log('   ✅ Columna notas agregada');
    } else {
      console.log('   ✅ Columna notas ya existe');
    }
    
    // 2. Actualizar estados existentes si hay datos
    console.log('2. Verificando pedidos existentes...');
    const existingOrders = await client.query('SELECT COUNT(*) as count FROM pedidos');
    const orderCount = parseInt(existingOrders.rows[0].count);
    
    if (orderCount > 0) {
      console.log(`   Encontrados ${orderCount} pedidos existentes`);
      console.log('   Actualizando estados antiguos...');
      
      // Mapear estados antiguos a nuevos
      const stateMapping = [
        { old: 'pendiente', new: 'no_revisado' },
        { old: 'procesando', new: 'en_proceso' },
        { old: 'en_espera', new: 'preparado' },
        { old: 'enviado', new: 'enviado' },
        { old: 'terminado', new: 'listo' },
        { old: 'problema', new: 'no_revisado' }
      ];
      
      for (const mapping of stateMapping) {
        const result = await client.query(
          'UPDATE pedidos SET estado = $1 WHERE estado = $2',
          [mapping.new, mapping.old]
        );
        if (result.rowCount > 0) {
          console.log(`   ✅ Actualizados ${result.rowCount} pedidos de '${mapping.old}' a '${mapping.new}'`);
        }
      }
    } else {
      console.log('   ✅ No hay pedidos existentes para actualizar');
    }
    
    // 3. Actualizar valor por defecto
    console.log('3. Actualizando valor por defecto...');
    await client.query(`ALTER TABLE pedidos ALTER COLUMN estado SET DEFAULT 'no_revisado'`);
    console.log('   ✅ Valor por defecto actualizado');
    
    // 4. Insertar métodos de envío y pago por defecto si no existen
    console.log('4. Verificando métodos de envío y pago...');
    
    const envioCount = await client.query('SELECT COUNT(*) as count FROM metodos_envio');
    if (parseInt(envioCount.rows[0].count) === 0) {
      console.log('   Insertando métodos de envío por defecto...');
      await client.query(`
        INSERT INTO metodos_envio (nombre, descripcion) VALUES 
        ('Estándar', 'Envío estándar 3-5 días hábiles'),
        ('Express', 'Envío express 1-2 días hábiles'),
        ('Recolección', 'Recolección en tienda')
      `);
      console.log('   ✅ Métodos de envío insertados');
    }
    
    const pagoCount = await client.query('SELECT COUNT(*) as count FROM metodos_pago');
    if (parseInt(pagoCount.rows[0].count) === 0) {
      console.log('   Insertando métodos de pago por defecto...');
      await client.query(`
        INSERT INTO metodos_pago (nombre, descripcion) VALUES 
        ('Transferencia', 'Transferencia bancaria'),
        ('Tarjeta', 'Tarjeta de crédito/débito'),
        ('Efectivo', 'Pago en efectivo'),
        ('PayPal', 'Pago con PayPal')
      `);
      console.log('   ✅ Métodos de pago insertados');
    }
    
    console.log('✅ Actualización del esquema de pedidos completada');
    
  } catch (error) {
    console.error('❌ Error en la actualización:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Función para verificar el estado final
async function verifyUpdate() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando estado final...');
    
    // Verificar estructura de la tabla
    const columns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'pedidos' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de tabla pedidos:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'none'})`);
    });
    
    // Verificar estados existentes
    const states = await client.query(`
      SELECT estado, COUNT(*) as cantidad 
      FROM pedidos 
      GROUP BY estado 
      ORDER BY cantidad DESC
    `);
    
    if (states.rows.length > 0) {
      console.log('\n📊 Estados de pedidos actuales:');
      states.rows.forEach(state => {
        console.log(`   ${state.estado}: ${state.cantidad} pedidos`);
      });
    } else {
      console.log('\n📊 No hay pedidos en la base de datos');
    }
    
    // Verificar métodos
    const envios = await client.query('SELECT COUNT(*) as count FROM metodos_envio');
    const pagos = await client.query('SELECT COUNT(*) as count FROM metodos_pago');
    
    console.log(`\n📦 Métodos de envío disponibles: ${envios.rows[0].count}`);
    console.log(`💳 Métodos de pago disponibles: ${pagos.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    client.release();
  }
}

// Ejecutar si el script se llama directamente
if (require.main === module) {
  updatePedidosSchema()
    .then(() => verifyUpdate())
    .then(() => {
      console.log('\n🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { updatePedidosSchema, verifyUpdate };
