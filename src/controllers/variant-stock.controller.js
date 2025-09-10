/**
 * ENDPOINT PARA OBTENER STOCK POR VARIANTE ESPECÍFICA
 * 
 * Soluciona el problema donde el frontend suma stock de todas las variantes
 * para cada talla, causando que muestre stock incorrecto.
 */

const express = require('express');
const { Pool } = require('pg');

// Usar la misma configuración de la base de datos del proyecto
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Obtener stock específico por variante
 * GET /api/products/variants/:variantId/stock
 */
async function getStockByVariant(req, res) {
  try {
    const { variantId } = req.params;
    
    console.log(`🔍 Obteniendo stock para variante ID: ${variantId}`);
    
    const query = `
      SELECT 
        s.id_talla,
        t.nombre_talla,
        t.orden,
        s.cantidad,
        s.precio
      FROM stock s
      INNER JOIN tallas t ON s.id_talla = t.id_talla
      WHERE s.id_variante = $1 
        AND s.cantidad > 0
      ORDER BY t.orden, t.nombre_talla;
    `;
    
    const result = await pool.query(query, [variantId]);
    
    console.log(`✅ Stock encontrado para variante ${variantId}:`, result.rows);
    
    res.json({
      success: true,
      message: 'Stock obtenido exitosamente',
      data: {
        id_variante: parseInt(variantId),
        tallas_stock: result.rows
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo stock por variante:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener stock',
      error: error.message
    });
  }
}

// Crear ruta para pruebas
const router = express.Router();
router.get('/variants/:variantId/stock', getStockByVariant);

module.exports = {
  getStockByVariant,
  router
};

// Si se ejecuta directamente, crear servidor de prueba
if (require.main === module) {
  const app = express();
  app.use(express.json());
  app.use('/api/products', router);
  
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de prueba ejecutándose en http://localhost:${PORT}`);
    console.log(`📡 Endpoint: GET /api/products/variants/:variantId/stock`);
    console.log(`🧪 Prueba: curl http://localhost:${PORT}/api/products/variants/14/stock`);
  });
}
