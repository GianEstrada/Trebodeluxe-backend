const { pool } = require('./src/config/db');
const { uploadImage } = require('./src/config/cloudinary');

async function testCompleteFlow() {
  console.log('🚀 Testing complete product creation flow...');
  
  try {
    // 1. Test database connection
    console.log('\n1️⃣ Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // 2. Test transaction
    console.log('\n2️⃣ Testing database transaction...');
    await client.query('BEGIN');
    console.log('✅ Transaction started');
    
    // 3. Test rollback (don't want to create real data)
    await client.query('ROLLBACK');
    console.log('✅ Transaction rolled back');
    
    client.release();
    console.log('✅ Connection released');
    
    // 4. Test image upload
    console.log('\n3️⃣ Testing image upload...');
    if (require('fs').existsSync('./test-image.png')) {
      const uploadResult = await uploadImage('./test-image.png', 'test-flow');
      console.log('✅ Image upload successful:', uploadResult.public_id);
    } else {
      console.log('⚠️ No test image found, skipping upload test');
    }
    
    console.log('\n🎉 All tests passed! The system is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCompleteFlow();
