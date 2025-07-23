require('dotenv').config();
const { cloudinary } = require('./src/config/cloudinary');

console.log('=== CLOUDINARY CONFIGURATION CHECK ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
console.log('Cloudinary URL:', process.env.CLOUDINARY_URL ? 'SET' : 'NOT SET');

// Test connection
cloudinary.api.ping()
  .then(() => {
    console.log('✅ Cloudinary connection successful');
  })
  .catch((error) => {
    console.log('❌ Cloudinary connection failed:', error.message);
  });
