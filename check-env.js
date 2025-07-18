require('dotenv').config();

console.log('=== VERIFICACIÓN DE VARIABLES DE ENTORNO ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'No definido');
console.log('PORT:', process.env.PORT || 'No definido');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Definido' : 'No definido');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Definido' : 'No definido');
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || 'No definido');

if (!process.env.JWT_SECRET) {
  console.log('⚠️  PROBLEMA: JWT_SECRET no está definido');
  console.log('🔧 SOLUCIÓN: Configurar JWT_SECRET en las variables de entorno');
}

if (!process.env.DATABASE_URL) {
  console.log('⚠️  PROBLEMA: DATABASE_URL no está definido');
  console.log('🔧 SOLUCIÓN: Configurar DATABASE_URL en las variables de entorno');
}

console.log('=== FIN VERIFICACIÓN ===');
