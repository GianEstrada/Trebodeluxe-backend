const { pool } = require('./src/config/db');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection fix...');
  
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Hacer una consulta simple
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Current database time:', result.rows[0].current_time);
    
    client.release();
    console.log('✅ Connection released successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDatabaseConnection();
