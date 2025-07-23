require('dotenv').config();
const { uploadImage } = require('./src/config/cloudinary');
const fs = require('fs');

// Crear una imagen de prueba simple (1x1 pixel en base64)
const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const testImagePath = './test-image.png';

async function testUpload() {
  try {
    // Crear archivo de prueba
    fs.writeFileSync(testImagePath, testImageData);
    
    console.log('🧪 Testing image upload...');
    const result = await uploadImage(testImagePath, 'test');
    
    console.log('✅ Upload successful!');
    console.log('URL:', result.url);
    console.log('Public ID:', result.public_id);
    
    // Limpiar archivo de prueba
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.log('❌ Upload failed:', error.message);
    
    // Limpiar archivo de prueba en caso de error
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

testUpload();
